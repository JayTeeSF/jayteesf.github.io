# Design: hey_durable_log

## Acknowledgement boundary

An append returns only after its DATA frames are written, its COMMIT frame is
written, and the durability barrier returns.

The barrier is the promise, so which call implements it is not an
implementation detail. On Linux it is `fdatasync`. On Darwin it is
`fcntl(fd, F_FULLFSYNC)`, because `fsync(2)` there states that after it returns
"the drive itself may not physically write the data to the platters for quite
some time", that on power loss "the application may find that only some or none
of their data was written", and that "this is not a theoretical edge case".
Acknowledging on `fdatasync` on that platform would be acknowledging the drive's
volatile cache -- the same defect as acknowledging RAM, one layer down.

`hdl_sync_barrier_name()` reports the barrier this build issues, and the
recovery gate asserts it per platform, so the promise cannot drift from the
code. A filesystem that refuses `F_FULLFSYNC` gets the error returned and the
batch is not acknowledged; degrading silently to a weaker barrier would leave
the promise stated and unmet. RAM is never the acknowledgement boundary, and
neither SQLite nor Git is ever a hidden one. `docs/FORMAT.md` holds the v1 byte
format and the recovery rules the frames encode.

## Group commit

`hdl_broker_submit` feeds a bounded in-memory queue. One writer thread drains it,
combines whatever concurrent requests are pending into a single durable batch,
and applies backpressure when the queue is full. Queues are bounded by
construction; the design has no unbounded-growth path. `hdl_broker_get_stats`
exposes `records`, `durable_batches` and `largest_batch`, which is what lets the
gate prove that combining actually happened rather than assuming it.

## Recovery

Recovery publishes only batches carrying a complete, checksummed COMMIT frame.

- A physically short final frame is truncated back to the last committed
  boundary.
- A valid but uncommitted tail is truncated back to the last committed boundary.
- A checksum failure inside a *complete* frame fails closed as corruption. It is
  never silently skipped, because skipping it would silently publish a prefix
  that the writer never acknowledged.

A newly created segment is synchronized before it can accept a batch.

## Replay cursors

Each replay cursor snapshots the last validated COMMIT boundary at open, then
streams one record at a time up to that snapshot. A cursor therefore never
observes a half-written concurrent batch, and a reader started mid-write sees a
committed prefix rather than a torn one.

## Ownership

`DurableLog.open` returns a journal capability that owns the loaded extension
handle. Receipts, replay cursors and replayed records are separately owned
handles with explicit `*_close` calls; `DurableLog.close` closes the journal
before unloading the extension.

## Version single source

The only in-source version literal is `hey_durable_log_version_value()` in
`adapter.hey`. `DurableLog.version()` and `HeyDurableLogInfo.version()` both
derive from it, and `bin/package-check` greps that literal against the `VERSION`
file, so a bump that forgets the source literal fails the gate.

## Portable test barrier

The broker group-commit gate proves "fewer durable batches than records", and it
can only prove it if the writer threads genuinely contend — which is the
barrier's job. `pthread_barrier_t` is an optional POSIX feature that Darwin does
not provide, so `tests/test_barrier.h` aliases it where it exists and supplies a
cycling mutex/condition-variable barrier where it does not. The shim has its own
gate (`tests/barrier_test.c`), because a barrier that released early would leave
the broker gate passing on timing luck instead of on group commit.

## Fit with the cagents v2 server

`CAGENTS-V2-FIT.md` states precisely what this journal buys that server, what it
does not, and what must be true before it becomes the acknowledgement authority.
The short version: SQLite's durable-commit ceiling is `1/barrier_cost` and does
not improve with more writers, because a WAL writer holds the exclusive write
lock across its fsync; this journal's is `batch_size/barrier_cost`. Those are
different asymptotes. The cost is that the SQLite projection now lags an
acknowledged write, and crash recovery becomes a replay.

## What remains package-owned

- atomically published segment rotation and its crash boundaries;
- verified snapshots and restore receipts before segment retirement;
- fenced quorum replication and the host-durability guarantee that depends on it;
- target-specific prebuilt release assets.

## Packaging boundary

Hey owns the generic FFI, native loader and package plumbing. This package owns
the journal format, its durability behaviour, and its releases. `hey_packager` is
external release tooling, vendored as `bin/hey-packager`, not a runtime package
dependency.

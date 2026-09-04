# What this journal buys the cagents v2 server, and what it does not

Every claim here is backed by either a gate in this repository or a measurement
in `docs/BENCHMARK-2026-09-04-darwin.md`. Where neither exists, it says so.

## The boundary cagents v2 has today

`cagents_v2-storage.md` puts SQLite at the bottom of the stack and the server on
top of it:

```text
Cagents API  ->  semantic storage  ->  hey_record  ->  hey_sqlite3  ->  workspace.sqlite3
```

with a launch profile of `journal_mode = WAL`, `synchronous = FULL`,
`busy_timeout = 5000`, and one bounded write coordinator per workspace.

That design is sound, and the concurrency reframing behind it — *how much write
contention does the hottest workspace create*, not *how many customers exist* —
is the right question. But it makes **SQLite the acknowledgement boundary**: the
API can only answer a mutation once the write transaction has committed.

## Why that boundary has a hard ceiling

In WAL mode a committing writer holds the exclusive `WAL_WRITE_LOCK` **across**
its `fsync`. So the durable-commit rate is:

```text
max commits/second  =  1 / barrier_cost
```

and it does not improve with more writers, because the writers are serialised by
the lock, not merely queued. `research/2026-09-04-sqlite-wal-baseline.md`
measured exactly that shape with a real barrier: **83.4 → 77.0 → 66.2
transactions/s at 1 → 4 → 8 writers.** Throughput *falls* as concurrency rises,
p99 goes from 9.9 ms to 480 ms, and `SQLITE_BUSY` stays at zero throughout — so
the symptom is latency, not an error a caller can retry on.

The same brief found SQLite has **no group commit**. Nothing in the engine
combines two concurrent transactions into one barrier. That is not a defect in
SQLite; it is a consequence of one writer at a time.

## What this journal changes

The journal moves the acknowledgement boundary off SQLite page updates and onto
a small append-only record, and then amortises **one device barrier across many
concurrent callers**:

```text
mutation -> hdl_broker_submit -> bounded queue -> one writer thread
                                                        |
                                          DATA frames + COMMIT frame
                                                        |
                                              ONE durability barrier
                                                        |
                                                 receipts released
                                                        |
                          (later, off the acknowledgement path)  SQLite projection
```

Measured on this project's development host: group commit is worth **22.3–23.0×**
at a batch of 32, stably across interleaved repeats, and p50 latency *falls* from
131–260 ms to 5–13 ms as batching rises. 3,200 records need 3,200 device flushes
one at a time and about 104 when batched.

The structural point is the one that matters more than the number: SQLite's
ceiling is `1/barrier_cost` **per writer-serialised commit**, and the journal's
is `batch_size/barrier_cost`. Those are different asymptotes, not different
constants.

## The invariant, structurally enforced

"Never make SQLite or Git the hidden acknowledgement boundary" is not a policy
this package asks callers to observe. It is a consequence of the shape: a
`DurableLog.append` that returns `ok` has already crossed the barrier, and it has
not touched SQLite at all. There is no code path in which a SQLite write is
required before an acknowledgement, because the journal has no SQLite dependency.

SQLite becomes the **queryable projection** of a log that is already durable. It
is then allowed to be slow — to fall behind, to checkpoint, to be rebuilt from
the journal — without any of that being a correctness question, because nothing
was ever acknowledged on its behalf.

## What this does NOT buy, stated plainly

- **It is not host durability.** These are local-disk guarantees: process crash,
  OS crash and power loss on this machine. Losing the host or the disk loses the
  journal. That needs fenced quorum replication before acknowledgement, which is
  not implemented (`fenced-quorum-replication`). Until it is, do not describe
  cagents v2 as surviving host loss because it has a journal.
- **The projection now lags.** A reader querying SQLite can be behind a mutation
  that has already been acknowledged. Anything that must reflect an acknowledged
  write immediately has to read through the journal or wait for the projection.
  That is a real new failure mode the current design does not have.
- **Crash recovery becomes a replay.** After a crash the projection must be
  caught up from the journal's committed prefix before it can be trusted. That
  replay is a startup cost and a correctness obligation cagents v2 does not have
  today.
- **It cannot help a single-writer workload.** One writer gets `1/barrier_cost`
  and nothing else — about 102 records/s against a ~10 ms flush on this host.
  Amortisation needs concurrent callers. A workspace with one active agent gains
  nothing.
- **It does not make SQLite faster.** It removes SQLite from the acknowledgement
  path. Query performance is unchanged.

## One concrete finding for the cagents v2 storage profile

The launch profile specifies `PRAGMA synchronous = FULL`. On Darwin **that is
not sufficient to reach the storage device.** `fsync(2)` on macOS does not flush
the drive cache; SQLite needs `PRAGMA fullfsync = ON` to issue `F_FULLFSYNC`, and
the SQLite documentation says so for this platform specifically.

Worse, the default is build-dependent and inconsistent on one machine: Apple's
`/usr/bin/sqlite3` 3.51.0 ships `DEFAULT_WAL_SYNCHRONOUS=1` (NORMAL) while other
builds ship 2 (FULL). At NORMAL, WAL commits do not sync at all, and what is lost
on power failure is not the last transaction but everything since the last WAL
sync — up to the autocheckpoint threshold, and unbounded under checkpoint
starvation.

Recommended additions to the launch profile, from
`research/2026-09-04-sqlite-wal-baseline.md`:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA fullfsync = ON;      -- required on Darwin; FULL alone is not a barrier
```

and pin `synchronous` explicitly at startup rather than inheriting it, failing
startup on a mismatch, since the compiled default cannot be relied upon.

This package hit precisely the same defect and fixed it (`hdl_sync_barrier_name`,
gated per platform). It is worth fixing in both places, because a journal with a
real barrier in front of a projection with a fake one still loses the projection.

## What must be true before integrating

Do not make this package the cagents acknowledgement authority until:

1. `position-back-link-format-v2` lands — the v1 frame chain links CRC *values*,
   which is position-independent, so it does not defend against replaying stale
   records once segments are reused;
2. `segment-rotation-atomic` lands with crash tests at every create, sync,
   rename and manifest boundary — a journal that cannot rotate is a journal that
   grows until the filesystem fills;
3. `bounded-memory-and-real-enospc` lands, against a genuinely full filesystem;
4. the projection replay path itself has a gate, which is cagents-side work and
   does not exist in this repository.

Items 1–3 are tracked here. Item 4 belongs to the cagents project and should be
recorded there before any integration date is discussed.

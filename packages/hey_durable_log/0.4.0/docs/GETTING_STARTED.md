# Getting started

A quick-start you can follow end to end without opening `adapter.hey`. Every
snippet below is taken from a file in `examples/` that is executed as written;
the outputs shown are real output from those runs.

## 1. Install and point at a Hey toolchain

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
export HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"
cd "$HOME/dev/hey_durable_log"
bin/check
```

## 2. Build the native library

The journal's storage core is C. Build it once and tell the adapter where it is:

```sh
bin/build-native --out .native-build/local
export HEY_DURABLE_LOG_LIBRARY="$PWD/.native-build/local/libhey_durable_log.dylib"   # .so on Linux
```

The adapter finds the library in this order: an explicit `library_path` option,
then `HEY_DURABLE_LOG_LIBRARY`, then `.hey/native/hey_durable_log/<version>/<target>/`,
then `.native-build/<target>/`.

One rule matters more than the order: **if you name a `library_path` and it does
not exist, you get an error, not a different library.** A caller who names a
build is choosing which code writes their bytes, and silently honouring another
one would make every durability promise afterwards a promise about code you did
not pick.

## 3. Open a journal

```hey
let opened = DurableLog.open('quickstart.hdl', {
  library_path: Env.default('HEY_DURABLE_LOG_LIBRARY', ''),
  queue_capacity: 256,
  max_batch_records: 64,
  batch_window_microseconds: 250
})
```

The path names a **directory**, and the journal creates it if it does not
exist. Inside it are the segment files, each named for its index and its base
position in the log -- `0000000000000000-0000000000000000.seg` is the first
one. Point `open` at an existing regular file and it is refused rather than
reinterpreted.

The three options are not decoration — they are the bounds the journal will
actually enforce:

| Option | What it controls | What happens at the limit |
|---|---|---|
| `queue_capacity` | how many submissions may be waiting for durability at once | the queue **refuses**; it never grows |
| `max_batch_records` | the most records one durability barrier is amortized across | a batch closes and syncs |
| `batch_window_microseconds` | how long the writer waits to collect a batch | the batch closes and syncs |

A zero or negative value is refused as `durable_log_open_invalid` rather than
replaced with a default, so the limit in force is always the one you chose.

`max_batch_records` is the single most important number for throughput. See
§8 — it is worth 25× on this hardware.

## 4. Append, and read the receipt

```hey
let receipt = DurableLog.append(journal, 42, 'first mutation')
says 'sequence ' + receipt.value.sequence
says 'batch ' + receipt.value.batch_id
says 'durability ' + receipt.value.durability
```

```text
sequence 1
batch 1
durability local_durable
```

`append` returns **only after** this record's DATA frame, its batch's COMMIT
frame, and the durability barrier have all completed. When it returns `ok`,
there is nothing further to wait for — the record is past the boundary.

The receipt's fields mean:

- **`sequence`** — the record's identity in this journal. Dense and monotonic
  from 1, so a consumer can detect a gap. It continues across a clean close and
  reopen; it never restarts.
- **`batch_id`** — which durable batch carried it. Several records share one
  `batch_id` when group commit combines them, which is the normal, desirable
  case under load.
- **`durable_offset`** — how far the journal is durable, in bytes. Strictly
  advancing.
- **`durability`** — the guarantee actually achieved. Today this is always
  `local_durable`: the bytes survived to this host's storage device. It is a
  named field rather than an implied one so that a future stronger level is a
  value change your code can branch on, not a silent redefinition.

**`local_durable` means local.** It survives process crash, OS crash and power
loss on this machine. It does **not** survive loss of the host or the disk;
that needs quorum replication before acknowledgement, which is not implemented.

## 5. Replay a committed prefix

```hey
let cursor = DurableLog.replay_open(journal).value
let first_record = DurableLog.replay_next(cursor).value
says 'replayed ' + Bytes.decode(first_record.payload, 'utf-8')
says 'exhausted ' + DurableLog.replay_next(cursor).value.done
```

```text
replayed first mutation
replayed second mutation
exhausted true
```

A cursor **snapshots the last committed boundary when it opens** and never grows
past it. That is what makes it safe to replay a live journal: the cursor cannot
observe a batch that is still being written, because it cannot observe anything
committed after it opened. Records appended later are invisible to it by design
— apply the finite prefix, then open another cursor.

`replay_next` returns `{done: true}` at the end rather than an error.

## 6. Close everything, in order

```hey
let cursor_closed = DurableLog.replay_close(cursor)
let journal_closed = DurableLog.close(journal)
```

Every handle this package returns — the journal, replay cursors, and the
receipts and records handled internally — owns native memory. Close cursors
before the journal, and the journal before the program ends. A leaked cursor
holds its snapshot and the native allocation behind it until the process exits.

Using a closed journal is safe but useless: it returns `native_handle_closed`
rather than misbehaving.

## 7. The error cases a real caller hits

```hey
says DurableLog.open('errors.hdl', {library_path: '/nonexistent/lib.dylib'}).code
says DurableLog.open('errors.hdl', {library_path: library, queue_capacity: 0, ...}).code
says DurableLog.append(journal, 1, 42).code
says DurableLog.append(journal, 1, 'still fine').ok
let closed = DurableLog.close(journal)
says DurableLog.append(journal, 1, 'too late').code
```

```text
durable_log_native_library_missing
durable_log_open_invalid
durable_log_payload_invalid
true
native_handle_closed
```

Note the fourth line: a refused payload does not harm the journal. The next
append still works.

### When you cannot afford to wait

`append` waits for queue space for as long as it takes. If your service would
rather shed load than block, bound the wait:

```hey
let written = DurableLog.append_within(journal, stream_id, payload, 50000)  # 50 ms
if written.ok == false and written.code == 'durable_log_busy'
  # It was NOT accepted. It is not in the log, retrying is safe, and dropping it
  # is your decision to make -- which is the point of being told rather than
  # blocked.
end
```

The bound covers **admission only**. Once your record has been admitted it is in
a batch on its way to a durability barrier: it may already be durable, so the
journal will not tell you it was refused. You can bound how long you wait to be
let in; once in, you wait for the truth.

A negative deadline is refused as `durable_log_admission_invalid` rather than
treated as no deadline at all. Zero means the unbounded wait, explicitly.

### Keeping the journal from growing forever

A rotating journal grows until something retires the segments a snapshot
already covers. The process that owns the journal is the one that does it —
and that is forced rather than chosen: a journal has one writer and holds an
exclusive lock for the life of the handle, so a separate operator binary cannot
open a live journal to retire anything from it.

```hey
let snapshot = DurableLog.snapshot(journal, '/backups/2026-09-04').value
says snapshot.first_sequence   # what it covers
says snapshot.last_sequence
says snapshot.digest           # identical for the same committed prefix

DurableLog.retire(journal, '/backups/2026-09-04')
```

`retire` verifies the snapshot by reading it back and comparing it with its own
receipt, proves it is a prefix of *this* journal, records the retirement
durably, and only then deletes anything. A snapshot that does not verify retires
nothing.

`snapshot_size` is not a setting; `segment_size_bytes` on `open` is — it decides
how much a single retirement can reclaim, because retirement works in whole
segments and never touches the one being appended to.

To read a retired prefix back, restore it beside the journal:

```hey
DurableLog.snapshot_restore(journal, '/backups/2026-09-04', '/restored')
```

The restored directory is a journal like any other, and it replays exactly what
the snapshot's receipt says it holds.

### Catching up without re-reading

Every replayed record says where it is and where the next one starts, so a
materializer stores the last one it applied and resumes there:

```hey
let cursor = DurableLog.replay_open_at(journal, applied_through).value
let record = DurableLog.replay_next(cursor).value
# ... apply it, then keep record.next_position as your new applied_through
```

Without this, a consumer that drains, closes and opens another cursor re-reads
everything it has already applied, and its replay lag grows with the length of
the **log** rather than with how far behind it is. That was measured at 2.5×
across a single run before it existed, and flat afterwards —
[docs/BENCHMARK-2026-09-04-replay-lag.md](BENCHMARK-2026-09-04-replay-lag.md).

A position the journal did not hand you is refused
(`durable_log_replay_position_refused`) rather than resynchronised: guessing
where a record starts is how a reader invents one that was never written.

### Asking what the journal carried

```hey
let load = DurableLog.stats(journal).value
says load.records          # mutations accepted
says load.durable_batches  # durability barriers those cost
says load.largest_batch    # the most records one barrier covered
says load.max_queue_depth  # high-water mark of the bounded ingress queue
says load.queue_capacity   # the bound you chose
```

One snapshot, so the numbers can be compared with each other rather than coming
from four different instants. `max_queue_depth` is the one to watch: it can
never exceed `queue_capacity`, and when it sits AT the capacity your submitters
are being pushed back rather than queued, which is the design working, not
failing.

`durable_batches` below `records` is group commit paying for itself -- but it
only combines CONCURRENT submissions. A single serial caller has nothing to
combine, so it will see `durable_batches == records` and `largest_batch == 1`.
That is the correct answer for that workload, not a misconfiguration.

### Reopening after a crash

Open the same path again. Recovery runs automatically and does one of three
things, and the difference between them is the whole design:

| On disk | What recovery does | What you see |
|---|---|---|
| Another writer already has it | refuses before touching anything | `durable_log_open_locked` |
| A partial or uncommitted tail | truncates back to the last committed boundary | `open` succeeds; the committed prefix is intact |
| A **complete** frame with a bad checksum | **fails closed** — never silently skipped | `durable_log_open_corruption` |
| Anything else that stops the open | fails closed | `durable_log_open_io`, `durable_log_open_invalid`, … |

A torn tail was never acknowledged, so discarding it loses nothing you were
promised. A complete-but-damaged frame **was** acknowledged, so discarding it
would silently lose a mutation someone was told had succeeded. Those two must
never be confused, and this package will not confuse them for you.

Branch on the code. `durable_log_open_corruption` means *stop writing, page a
human, restore from a verified snapshot*. It does not mean *retry*.
`durable_log_open_locked` is the opposite: nothing is wrong with the journal,
another writer simply owns it, so waiting or failing over is the right response
and paging anyone is not.

### The ambiguous acknowledgement — read this one

If your caller crashed, timed out, or lost its connection **after** the COMMIT
was made durable but **before** it saw the receipt, then the mutation is in the
journal and the caller does not know it.

This package cannot fix that for you, and neither can any other one: the failure
is in the gap between "durable" and "told you so", and no amount of journal
cleverness closes a gap that exists outside the journal. An error, a timeout, or
a lost response is **not** proof the mutation was absent.

The only correct resolution is **application idempotency**: give each mutation a
caller-supplied idempotency key, and on retry make the second attempt observe
the first one's effect instead of duplicating it. Design that in before you take
traffic, not after you have two of something.

## 8. What it costs, and why the batch size matters

A durability barrier costs about the same whether it carries one record or
thirty-two. Group commit is the entire difference, and it is worth roughly
**22×** on this project's development host:

| `max_batch_records` | Throughput | p50 latency | Device flushes for 3,200 records |
|---:|---:|---:|---:|
| 1 | 112–243/s | 131–260 ms | 3,200 |
| 8 | 1,002–1,792/s | 18–34 ms | 400 |
| 32 | 2,494–5,490/s | 5–13 ms | ~104 |

Ranges, not single numbers, because that host was under concurrent load; the
*ratios* held steady across interleaved repeats even though the absolute figures
drifted 2×. Method, hardware and what the data does **not** support are in
`docs/BENCHMARK-2026-09-04-darwin.md`. Read that before quoting any of these.

Two consequences worth designing around:

- **Throughput and latency improve together here.** That is not the usual
  trade-off. Batching is not making anyone wait; it is preventing 3,200 separate
  device flushes.
- **This journal cannot help a single-writer workload.** One writer gets
  `1 / barrier_cost` — about 102 records/s against a ~10 ms flush — and no
  batching setting changes that. The value is entirely in amortising one barrier
  across concurrent callers.

## 9. Optional: surviving loss of the host

Everything above is *local* durability. To survive losing the machine, a record
has to be durable on other machines before you are told yes. That is `cluster.hey`,
and it is opt-in.

```hey
import '../cluster.hey'

let cluster = DurableLogCluster.open(journal, {
  peers: ['node-b', 'node-c'],
  term: 7,
  replicate: my_remote_call_adapter
}).value

let receipt = DurableLogCluster.append(cluster, 3, 'replicated mutation')
says receipt.value.durability   # quorum_durable
says receipt.value.acks         # 3 of a required 2
```

Three things to understand before relying on it:

- **`durability` becomes `quorum_durable`.** It is a different guarantee with a
  different name, never a vaguer version of the same one.
- **An unreachable majority is an error, not a downgrade.** You get
  `durable_log_quorum_unavailable`; the record *is* on local disk, but you are not
  told the cluster accepted it, because it did not.
- **A stale leader is fenced.** Every append carries a `term`, and a higher term
  seen anywhere returns `durable_log_fenced`. Partition and death look identical
  from inside, so this is the only thing standing between you and two leaders
  acknowledging different writes.

The `replicate` seam is injected deliberately: the decision logic is gated
without a live cluster, but wiring it to `Remote.call` against real peers is
**not** tested in this repository yet.

## Release workflow

```sh
bin/check
bin/release
unzip -tq "dist/hey_durable_log-$(cat VERSION).zip"
bin/source-zip
bin/publish --no-commit
```

`bin/publish` refuses to overwrite an existing version and defaults to
`$HOME/dev/jayteesf.github.io/packages`.

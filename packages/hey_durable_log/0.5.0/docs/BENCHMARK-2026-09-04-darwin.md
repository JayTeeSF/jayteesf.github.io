# Group-commit benchmark — Darwin, 2026-09-04

Supersedes nothing. `docs/BENCHMARK-2026-09-04.md` was measured on a different
executor with a **different durability barrier**, and its numbers are not
comparable to these — see "What changed" below.

## What changed since the earlier run

Two things, and both move the numbers.

1. **`bin/benchmark` did not compile on Darwin at all** until commit 73f39b1.
   It used `pthread_barrier_t`, which macOS does not provide. So the earlier
   document's figures were not produced on this class of host.
2. **The durability barrier changed** (commit e7f9ca4). This build issues
   `fcntl(F_FULLFSYNC)` on Darwin instead of `fdatasync`, because `fsync(2)`
   on this platform does not flush the drive's cache. The earlier numbers were
   measuring a barrier that does not survive power loss.

The cost of that correction, same host, same parameters (8 writers, 250 records,
max_batch 64, window 250 µs):

| Barrier | Throughput | p50 |
|---|---:|---:|
| `fdatasync` (does **not** survive power loss on Darwin) | 3,602/s | 3.3 ms |
| `F_FULLFSYNC` (flushes the device cache) | 888/s | 9.0 ms |

**A benchmark of a durable log is uninterpretable unless it states whether fsync
was a real barrier.** Everything below used F_FULLFSYNC.

## Hardware and method

- Apple silicon laptop, 12 logical cores, 64 GiB RAM, macOS 15.6 (Darwin 25.6.0), APFS internal SSD.
- `hey_durable_log` main_v2 @ c9fee2a, built `-O2 -std=c11 -Wall -Wextra -Werror -Wpedantic`.
- `bin/benchmark <writers> <ops-per-writer> <max_batch> <window_us>`.
- Each producer submits one record and waits for its durability receipt, so
  every latency below is a full acknowledgement round trip, not a queue insert.
- Every run uses a fresh `mkstemp` journal, unlinked first, so no run inherits
  another's file.

### An honesty note about this host

**These runs are contaminated by concurrent load** — five research subagents and
repeated C builds were running on the same laptop. The evidence is in the data:
in the interleaved experiment below, every condition gets monotonically faster
from round 1 to round 3 as that load drained, by roughly 2×.

So: **the absolute throughput figures here are not a clean measurement of this
hardware.** They are a floor. The *ratios within a round* are trustworthy,
because interleaving exposes every condition to the same drift, and that is what
this document draws conclusions from. A clean measurement on quiescent,
representative NVMe is a separate task (`nvme-latency-throughput-replay-lag`)
and has not been done.

## The result that matters: group commit versus the barrier

32 concurrent writers, 100 records each (3,200 total), window 250 µs, varying
only `max_batch_records`. Conditions were **interleaved** — round 1 ran all four
settings, then round 2, then round 3 — so the drift described above applies
equally to each.

| Round | max_batch | Throughput | p50 | p99 | Durable batches | Speed-up vs batch=1 |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 112/s | 259.9 ms | 860.9 ms | 3,200 | 1× |
| 1 | 8 | 1,002/s | 33.8 ms | 41.0 ms | 400 | 8.9× |
| 1 | 32 | 2,494/s | 12.8 ms | 25.5 ms | 104 | 22.3× |
| 1 | 64 | 2,043/s | 14.7 ms | 27.8 ms | 107 | 18.2× |
| 2 | 1 | 147/s | 227.1 ms | 273.1 ms | 3,200 | 1× |
| 2 | 8 | 1,260/s | 25.1 ms | 33.1 ms | 400 | 8.6× |
| 2 | 32 | 3,383/s | 9.1 ms | 12.0 ms | 103 | 23.0× |
| 2 | 64 | 5,905/s | 5.1 ms | 8.1 ms | 102 | 40.2× |
| 3 | 1 | 243/s | 131.0 ms | 142.1 ms | 3,200 | 1× |
| 3 | 8 | 1,792/s | 17.9 ms | 23.9 ms | 400 | 7.4× |
| 3 | 32 | 5,490/s | 5.4 ms | 11.7 ms | 104 | 22.6× |
| 3 | 64 | 5,396/s | 5.2 ms | 11.0 ms | 107 | 22.2× |

**What is robust across all three rounds**, despite the 2× drift:

- batch 8 is worth **7.4–8.9×** over one record per barrier;
- batch 32 is worth **22.3–23.0×**, remarkably stable;
- p50 latency *falls* from 131–260 ms to 5–13 ms as batching rises. Throughput
  and latency improve together, which is not the usual trade-off and is the
  whole point: the queue is not making anyone wait, it is stopping 3,200
  separate device flushes from happening.
- 3,200 records need **3,200** device flushes at batch 1 and **~104** at
  batch 32.

**What is NOT supported by this data:** any claim that batch 64 differs from
batch 32. It wins in round 2, loses in round 1, ties in round 3. With 32 writers
the achieved batch is ~31 either way, so the setting is not binding. An earlier
single-shot sweep appeared to show batch 32 beating batch 64 by 2.5×; the
interleaved repeats refute that, and it was drift.

## Writer scaling

max_batch 64, window 250 µs, 250 records per writer, median of 3 runs.

| Writers | Throughput | p50 | Achieved batch |
|---:|---:|---:|---:|
| 1 | 102/s | 10.0 ms | 1.00 |
| 8 | 774/s | 10.0 ms | 8.00 |
| 32 | 3,014/s | 9.8 ms | 31.87 |
| 64 | 4,788/s | 13.0 ms | 57.76 |

The shape is the argument. **p50 stays near 10 ms from 1 writer to 32** while
throughput rises 30×. A device flush costs about 10 ms on this host whether it
carries one record or thirty-two, so concurrency is free until the batch fills.
At 64 writers the batch saturates (57.76 of a 64 cap) and latency starts to rise
— that is where the next producer begins to wait for the next barrier rather
than joining the current one.

Single-writer throughput is `1 / barrier_cost` and nothing else: 102/s against a
~10 ms flush. **A journal like this cannot help a workload with one writer.**
Its entire value is amortising a barrier across concurrent callers.

## What this does not measure

- **Queue depth and backpressure under saturation.** Not instrumented. The
  bounded queue is asserted by the specs; its behaviour at the limit is not
  measured here.
- **Replay lag** while writers saturate the log.
- **A SQLite denominator.** The SQLite WAL research brief measured 23,354 rows/s
  single-writer with `fullfsync` off, and 83 txn/s with it on. Until the same
  barrier is used on both sides, no comparison between them is meaningful, and
  none is made here.
- **Anything about representative server NVMe.** This is a laptop under load.
- **Power-loss behaviour.** F_FULLFSYNC is the right call to make; that it is
  honoured end-to-end by this drive is asserted by Apple's documentation, not by
  a power-cut test on this hardware.

## Reproduce

```sh
bin/check
bin/benchmark 32 100 1 250
bin/benchmark 32 100 32 250
bin/benchmark 8 250 64 250
```

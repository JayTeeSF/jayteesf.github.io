# Replay lag, queue depth and append latency — 2026-09-04

**Expectations were written down before anything was measured.** They are in the
next section, unchanged. Writing them afterwards turns a benchmark into a
description of whatever happened, which is worth nothing.

## Hardware and build

- Apple M-series laptop, macOS 26.6, APFS on internal NVMe.
- Durability barrier: `F_FULLFSYNC` (4.020 ms measured — see
  `docs/BENCHMARK-2026-09-04-linux-vs-sqlite.md`), which is the real cost floor
  for every number below.
- `hey_durable_log` at the commit named in the results section, built `-O2`.
- **This is a laptop, not the representative NVMe host.** Every figure here is
  labelled as a laptop figure and must not be quoted as anything else. The
  Hetzner x86 bare-metal run this task also wants is still owed.

## What "replay lag" means here

The time from a record being submitted to a replay consumer observing it,
end to end. That includes the batch window, the durability barrier, and the
cursor cadence — a cursor snapshots the committed boundary when it opens, so a
materializer drains a finite prefix and then opens another cursor, and the
gap between passes is part of the lag a consumer actually sees.

Measuring it any other way — from "durable" to "read", excluding the cursor
cadence — would report a number no consumer experiences.

## Expectations, stated in advance

At 8 writers against the default 250 µs batch window on the hardware above:

1. **p50 replay lag < 25 ms.** One barrier is 4 ms; a record should wait for at
   most a few batches plus one cursor pass.
2. **p99 replay lag < 250 ms.**
3. **Maximum replay lag < 1 s.** A reader that ever falls a full second behind
   at this write rate is not keeping up.
4. **Replay lag does not GROW.** The second half of the run must not have a p50
   more than 2× the first half's. This is the invariant; 1–3 are the numbers.
   A reader that is merely slow shows a high but flat lag, and a reader that is
   falling behind shows a rising one — only the second is a defect in the
   design rather than in the hardware.
5. **Queue depth stays at or below the configured capacity**, and reaches it
   under saturation.

Where these were missed is recorded below, next to the outcome, rather than
edited out.

## Results

`bin/benchmark-replay-lag <writers> <ops> <max_batch> <window_us> <capacity>`,
built from commit b6968d5, run on the laptop described above. Every number below
was produced by the command shown; none was adjusted.

### Writer scaling, capacity 256, window 250 µs

| Writers | Throughput | p50 lag | p95 lag | p99 lag | max lag | first→second half |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 215/s | 6.261 ms | 7.978 ms | 8.665 ms | 9.247 ms | 1.39× |
| 4 | 801/s | 7.419 ms | 8.747 ms | 9.166 ms | 9.377 ms | 1.17× |
| 8 | 1,387/s | 8.877 ms | 11.983 ms | 12.370 ms | 12.492 ms | 1.33× |
| 32 | 4,398/s | 16.590 ms | 36.095 ms | 40.779 ms | 43.521 ms | **2.15×** |
| 32 (400 ops) | 4,291/s | 29.706 ms | 61.663 ms | 76.659 ms | 79.516 ms | **2.47×** |

### Queue depth

| Writers | Capacity | Depth reached | Largest batch | Throughput |
|---:|---:|---:|---:|---:|
| 8 | 4 | 4 | 4 | 720/s |
| 8 | 16 | 8 | 8 | 1,386/s |
| 8 | 256 | 8 | 8 | 1,387/s |
| 32 | 8 | 8 | 8 | 1,181/s |
| 32 | 256 | 32 | 32 | 4,398/s |

Batch size is `min(concurrent writers, queue capacity)` and throughput is that
batch divided by one 4 ms barrier. Nothing here is a surprise; it is the shape
the group-commit design predicts, now measured end to end including the reader.

## Against the expectations

1. **p50 < 25 ms at 8 writers — MET.** 8.877 ms.
2. **p99 < 250 ms at 8 writers — MET.** 12.370 ms.
3. **Max < 1 s — MET** everywhere measured; worst was 129 ms, at 32 writers
   against a queue of 8.
4. **Lag must not grow — MISSED at 32 writers.** 2.15× across the run, and
   2.47× when the same configuration wrote twice as many records. This is the
   expectation that mattered and it is the one that failed.
5. **Queue depth reaches capacity under saturation — MET only where the
   capacity is below the writer count.** At capacity 256 the depth stopped at
   the number of concurrent writers (8 and 32), because a queue cannot be made
   deeper than the number of submitters. Stated as written, this expectation was
   partly untestable; the honest form is "depth reaches `min(writers,
   capacity)`", and it does.

## Why the lag grows, and what it costs

**A replay cursor cannot resume.** `hdl_cursor_open` always starts at the origin
of the log, so a materializer that drains, closes, and opens another cursor
re-walks everything it has already seen. Per-pass cost therefore grows linearly
with the length of the log, and the lag a consumer sees grows with it.

The measurement supports that reading rather than merely being consistent with
it: holding writers and configuration fixed and doubling the record count moved
p50 from 16.590 ms to 29.706 ms (1.79×) and growth from 2.15× to 2.47×. A reader
whose cost per pass were constant would show neither.

This is a property of the public API, not of the benchmark. Any consumer that
follows the model `docs/FORMAT.md` describes -- apply a finite committed prefix,
then open another cursor -- pays it. Tracked as `resumable-replay-cursor`.

At the volumes a cagents workspace produces this is not urgent; at a sustained
4,000 records/s it is the first thing that will hurt.

## After the fix: two costs, not one

The diagnosis above was half right, and the benchmark is what showed it.

Making the reader RESUME (`hdl_cursor_open_at`) barely moved the growth:
2.54× → 2.44× at 12,800 records. If re-walking had been the whole story it
would have gone flat. It did not, because **opening a cursor ran a full
validating scan of the log** — so every pass cost O(log length) no matter where
it started, and the resume saved only the reading, not the opening.

A cursor now takes the committed boundary from the handle that wrote it rather
than re-deriving it from the bytes. That is safe for a specific reason: the
handle holds an exclusive writer lock, so nothing else can have moved the tail
since it last wrote, and every frame is still validated when the cursor READS
it. What was dropped is re-deriving a boundary already known.

Same command, same hardware, 32 writers, 400 operations each:

| Reader | p50 | p95 | p99 | max | first→second half |
|---|---:|---:|---:|---:|---:|
| from the origin (old) | 17.783 ms | 36.341 ms | 38.805 ms | 43.779 ms | 2.59× |
| resuming | 5.123 ms | 7.220 ms | 10.791 ms | 14.981 ms | **0.99×** |
| resuming, 25,600 records | 5.031 ms | 6.605 ms | 10.620 ms | 22.028 ms | **1.00×** |

Expectation 4 is now met, and met at two log lengths — which is the point, since
the defect was that the lag depended on how much had already been written. p50
fell from 29.706 ms to 5.031 ms at the larger size: five milliseconds is roughly
one durability barrier plus one cursor pass, which is the floor this design has.

A reader that does NOT resume still grows, as it must: re-reading the log is
inherently O(log). Both mechanisms had to be fixed, and either one alone leaves
the lag rising.

## What this is not

A representative-NVMe measurement. This is a laptop under a normal desktop load,
using `F_FULLFSYNC`, and the Linux production path uses a different and cheaper
barrier (`fdatasync`, 0.514 ms measured). The bare-metal x86 run is still owed
and is tracked separately; nothing here should be quoted as a production figure.


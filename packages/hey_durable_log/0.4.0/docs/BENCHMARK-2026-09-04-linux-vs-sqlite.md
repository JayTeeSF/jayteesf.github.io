# Is this actually faster than SQLite? — Linux, 2026-09-04

This document exists to answer one question, because if the answer is no the
package should not exist: **is putting this journal in front of SQLite faster
than writing to SQLite directly?**

The answer is **yes above about two concurrent writers, and no at one**, and the
margin grows with concurrency because the two designs have different asymptotes,
not different constants.

## Why the earlier comparison was worthless

An earlier note recorded that SQLite beat this broker outright. That measurement
was real but the comparison was not: the two sides were not being asked to
survive the same failure. Establishing that took three probes.

### Darwin has three durability tiers, not one

`benchmarks/probes/darwin_barrier_tiers.c`, this laptop, APFS:

| Primitive | Cost | What it actually guarantees |
|---|---:|---|
| `fsync` / `fdatasync` | 0.045 ms | reached the drive; **not** the platters. Not power-safe. |
| `F_BARRIERFSYNC` | 0.239 ms | I/O ordering barrier. Still not a media flush. |
| `F_FULLFSYNC` | 4.020 ms | the drive flushed its cache. Power-safe. |

A factor of **89× between the fastest lie and the truth.** Any Darwin benchmark
that does not say which of these it used is not reporting anything.

### Apple's SQLite does not reach the bottom tier

`benchmarks/probes/sqlite_durability_matrix.c`, SQLite 3.51.0 on macOS:

| journal_mode | synchronous | fullfsync | Cost/commit |
|---|---|---|---:|
| WAL | NORMAL | ON | 0.020 ms |
| WAL | FULL | OFF | 0.080 ms |
| WAL | FULL | **ON** | **0.377 ms** |
| WAL | EXTRA | ON | 0.999 ms |
| DELETE | FULL | ON | 1.739 ms |

`PRAGMA fullfsync=ON` does change behaviour — 0.080 → 0.377 ms — but the result
lands in the **barrier** tier, not the 4.0 ms flush tier. On this build,
`journal_mode=WAL, synchronous=FULL, fullfsync=ON` does not give media
durability. Meanwhile this journal's single-writer p50 was 3.99 ms: *exactly one
`F_FULLFSYNC`*, which is the barrier it claims and no waste around it.

So the old comparison pitted a real device flush against an ordering barrier. It
was not close, and it was not a comparison.

## The fair test: Linux, where production runs

On Linux both engines use the same primitive, so the comparison is honest.

Bare barrier cost in this environment: `fsync` 0.475 ms, `fdatasync` 0.514 ms.
SQLite at `WAL, synchronous=FULL` costs 0.605 ms/commit — i.e. **one real
`fdatasync` per commit.** Same primitive, same tier, same cost floor. Apples to
apples.

`bin/benchmark-sqlite <writers> <ops> <max_batch> <window_us>`, 80 records per
writer, both lanes in one process invocation, back to back, each SQLite writer on
its own connection with a 30 s busy timeout:

| Writers | SQLite | This journal | Throughput | SQLite p99 | Journal p99 |
|---:|---:|---:|---:|---:|---:|
| 1 | 1,630/s | 1,279/s | **0.78×** | 1.9 ms | 1.5 ms |
| 4 | 1,061/s | 3,484/s | **3.28×** | 3.0 ms | 1.9 ms |
| 8 | 944/s | 7,628/s | **8.08×** | 2.3 ms | 2.2 ms |
| 32 | 797/s | 24,305/s | **30.51×** | **532 ms** | **2.5 ms** |

Two things in that table matter more than the headline ratio.

**SQLite gets slower as writers arrive.** 1,630 → 1,061 → 944 → 797. That is not
noise; it is the WAL write lock. A committing writer holds the exclusive lock
*across* its `fdatasync`, so the durable commit rate is `1 / barrier_cost` no
matter how many writers are waiting, and the waiting itself costs something. The
journal goes the other way — 1,279 → 3,484 → 7,628 → 24,305 — because more
concurrent callers mean a bigger batch under one barrier.

**The tail is the real story.** At 32 writers SQLite's p99 is 532 ms against the
journal's 2.5 ms — **215× better**. Throughput ratios can be argued about;
a half-second p99 on a coordination write cannot.

### Where SQLite wins, stated plainly

**At one writer, SQLite is faster** (1,630 vs 1,279/s, 0.78×). There is no batch
to amortise, so the journal pays its barrier plus queue handoff for nothing. This
is the same limit recorded in the quick-start: *a journal like this cannot help a
single-writer workload.* The crossover is between one and four writers.

If the cagents v2 hottest workspace only ever has one active writer, this package
is a cost, not a benefit. The design bet is that it does not.

## A 3.5× Linux optimisation we have NOT taken yet

`benchmarks/probes/preallocation_effect.c`:

| Platform | Extending the file | Writing in place (preallocated) |
|---|---:|---:|
| Linux (`fdatasync`) | 0.454 ms/op | **0.131 ms/op** |
| Darwin (`F_FULLFSYNC`) | 3.999 ms/op | 4.031 ms/op |

On Linux, `fdatasync` still has to flush the file-size metadata when an append
extends the file. Preallocate the segment and write inside it and that metadata
update disappears — **3.5× cheaper barriers, on the production platform.** On
Darwin it changes nothing, because the device flush dominates.

**This is deliberately not implemented yet, and the reason is a correctness one.**
A preallocated segment is full of zeros past the last commit. Recovery must then
distinguish "space we reserved and have not written" from "a complete frame that
has been damaged" — and today it correctly calls a physically complete frame with
a bad header *corruption*, and fails closed. Shipping preallocation without first
teaching the format where the reserved region ends would either break every
reopen or, far worse, require the all-zeros heuristic that
`refuse-availability-first-recovery-behaviours` explicitly refuses etcd for.

The segment header has to record the preallocated extent, and it is checksummed
at creation, so this is a format change. It therefore belongs with
`position-back-link-format-v2` and ahead of `segment-rotation-atomic`, and it is
tracked as `preallocated-segments-linux-fdatasync`.

## Honest limits of these numbers

- **The Linux figures come from Docker on macOS**, whose disk is a file on APFS.
  The *ratios* and the *shape* (SQLite falling, journal rising) are meaningful
  because both lanes run in the same container against the same storage. The
  absolute numbers are **not** Hetzner numbers and must not be quoted as such.
  A bare-metal x86 run is still owed.
- Both lanes ran back to back in one invocation, not interleaved across repeats.
  The 30× at 32 writers is large enough to survive that; the 0.78× at one writer
  is close enough that it should not be treated as precise.
- No power-cut test has been performed on either platform.

## Reproduce

```sh
bin/check-linux                                  # C gates on Linux
bin/benchmark-sqlite 8 80 64 250                 # head to head, host platform
docker run --rm -v "$PWD":/src hey-durable-log-linux /bin/sh -c '
  cd /src && cc -DHDL_ENABLE_TEST_HOOKS -O2 -std=c11 -Iinclude -Itests \
    src/hey_durable_log.c benchmarks/sqlite_compare.c -pthread -lsqlite3 -o /tmp/cmp \
  && for w in 1 4 8 32; do /tmp/cmp $w 80 64 250; done'
```

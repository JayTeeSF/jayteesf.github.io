# The solitary writer stops waiting for company — Linux, 2026-09-05

[docs/BENCHMARK-2026-09-04-linux-vs-sqlite.md](BENCHMARK-2026-09-04-linux-vs-sqlite.md)
answered "is this faster than SQLite" with **yes above about two concurrent
writers, and no at one**. This document is about the "no at one", which was not
a property of the design but a wait the broker did not need to take.

## What changed

The broker holds the first record of a batch for `batch_window_microseconds` so
that concurrent callers can join it and share one durability barrier. That is
the whole reason it beats SQLite under load. With a single caller it was pure
added latency, and the reason it is safe to skip is exact rather than a
heuristic: **a caller blocked in `hdl_broker_submit` cannot submit again**, so
when exactly one caller is in flight the window is a wait for something that
provably is not coming.

This is PostgreSQL's `commit_siblings`, which applies `commit_delay` only when
enough other transactions are already active. It was recorded as accepted in
decision `refuse-availability-first-recovery-behaviours` and deliberately not
built, for a stated reason that expired: on Darwin the barrier costs about 10 ms
against a 250 us window, so there was nothing measurable to verify a fix
against. On Linux — the production platform — `fdatasync` costs about 0.5 ms and
the window is 250 us, so a solitary writer was paying roughly half again its
append cost to wait for nobody.

At two or more callers in flight the window behaves exactly as it did, which the
numbers below are there to confirm rather than assert.

## The host, and what it is not

| | |
|---|---|
| Machine | Apple M3 Pro, 18 GiB, macOS 26.6.2 |
| Linux | Docker Desktop 29.1.3, `linux/arm64`, Debian container |
| Filesystem | container overlay, backed by a disk image on APFS |
| Barrier | `fdatasync` (`hdl_sync_barrier_name()` asserts it) |
| SQLite | 3.40.1, WAL, `synchronous=FULL` |

**Read these as this host, not as a general answer.** The disk is a file on a
laptop's APFS volume, so the absolute figures describe this container and
nothing else; the ratios and the before/after are what this document is for. A
real-Linux run is underway and tracked as `bare-metal-nvme-acceptance-run` --
and the one-writer number is exactly the one to re-check there, because with no
batching the broker's fixed cost is a larger fraction of a cheaper `fdatasync`,
so slower storage flatters this change.

## Before and after, one writer

`./.build/group_commit 1 400 64 250`, same container, same build flags, the only
difference being whether the window is skipped:

| | Throughput | p50 | p95 | p99 | Elapsed |
|---|---:|---:|---:|---:|---:|
| Window always waited | 1,309 rec/s | 0.674 ms | 1.319 ms | 1.908 ms | 305.5 ms |
| Window skipped at one caller | 2,665 rec/s | 0.260 ms | 1.338 ms | 1.792 ms | 150.1 ms |
| | **2.04x** | **2.59x** | — | — | |

## Group commit is untouched

The concern with any change like this is that it quietly stops batching. It does
not, and `average_batch` is how you can see that rather than take it on faith:

| Writers | Before | After | average_batch after |
|---:|---:|---:|---:|
| 8 | 9,219 rec/s | 9,668 rec/s | 8.00 |
| 32 | — | 30,497 rec/s | 31.37 |

A batch of 8.00 at eight writers and 31.37 at thirty-two is every concurrent
caller still sharing one barrier.

## Against SQLite, same run, same barrier

`./.build/sqlite_compare <writers> 200`, all four rows from one invocation so
they can be compared with each other:

| Writers | SQLite | This journal | Ratio |
|---:|---:|---:|---:|
| 1 | 2,100/s | 2,728/s | **1.30x** |
| 4 | 1,254/s | 5,173/s | **4.12x** |
| 8 | 1,503/s | 8,576/s | **5.71x** |
| 32 | 1,824/s | 27,245/s | **14.94x** |

A separate run at `1 400` measured 1,670/s against 2,504/s, **1.50x**. The
one-writer margin is small and noisy — it is one barrier against one barrier,
and the only thing between them is bookkeeping — so the honest claim is that
**this package no longer loses at one writer**, not that it wins comfortably
there.

The ratios differ from the 2026-09-04 document because these are 200 operations
per writer rather than that run's parameters, and because a laptop under Docker
is a noisy host. Rows within a table are comparable with each other; rows across
the two documents are not.

## What a consumer can check

`DurableLog.stats` reports `window_waits` — how many durable batches actually
waited out the window. It is counted rather than timed, because "we stopped
waiting when waiting could not help" should be checkable rather than believed,
and a stopwatch on a laptop is not a check. A solitary writer must see 0.

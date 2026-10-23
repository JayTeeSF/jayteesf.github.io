# Performance history

**This file accumulates. Rows are appended, never rewritten**, so a regression
between two builds is visible by reading down a column. Every other benchmark
document here is a snapshot that answers one question on one day; this one exists
to answer "did it get slower, and between which two commits".

## Why every row pins a SHA and not a version

Two identifiers move independently and either can change a number:

- **`hey_durable_log` SHA** — our own code, including the on-disk format.
- **Hey SHA** — the compiler and runtime.

Versions are not enough for the second. Hey pushed **8 commits between
`74051ac3d` and `e3f6396fd`** while this session was running, including
`llvm: evaluate boxed file-read paths through shared string consumer` and
`llvm: preserve scalar comparisons and release extracted array values` — codegen
changes, exactly the kind that move a benchmark. Both SHAs report a version, and
for part of that range the version string did not change at all. **A row
labelled only `0.99.561a` cannot be compared with another row labelled
`0.99.561a`.** So every row carries a SHA.

Get them with:

```sh
(cd "$HEY_ROOT" && git rev-parse --short HEAD)   # Hey
git rev-parse --short HEAD                        # this package
```

`bin/benchmark-hey` prints both before it measures anything.

## The three lanes, and why the distinction is not pedantry

| Lane | What runs | Sensitive to |
|---|---|---|
| **C core** | `bin/benchmark`, `bin/benchmark-sqlite`, `bin/benchmark-replay-lag` | package SHA only |
| **Hey interpreter** | `bin/benchmark-hey`, `heyc --run` | both SHAs |
| **Hey compiled** | `bin/benchmark-hey`, `heyc stage0-build` | both SHAs |

**Every benchmark this package had before 2026-09-05 was pure C** and never
loaded the Hey runtime. Those numbers cannot move when Hey changes, so recording
a Hey SHA beside them would be recording a field that does not affect the
measurement. `benchmarks/hey_surface.hey` exists to give the Hey SHA something
to mean.

Interpreter and compiled are reported separately because they differ by more
than a rounding error — **53× on replay**, below — and quoting either alone
misrepresents the language in whichever direction suits the argument.

## Hosts

| Id | Machine | OS | Storage | Barrier |
|---|---|---|---|---|
| `darwin-m3` | Apple M3 Pro | Darwin 25.6.0 arm64 | APFS on internal SSD | `F_FULLFSYNC`, 4.020 ms |
| `docker-on-darwin-m3` | same, in Docker | Linux container | **disk is a file on APFS** | `fdatasync`, 0.514 ms |
| `linux-1165g7` | Intel i7-1165G7 4C/8T, 31 GiB | Omarchy/Arch 7.1.9 x86_64, virt=none | Samsung 980 PRO NVMe → LUKS → btrfs, `compress=zstd:3,ssd,space_cache=v2`, write-back cache | `fdatasync`, **6.1 ms** |
| `linux-1165g7-tmpfs` | same host | same | **tmpfs — RAM, kept as a control** | `fdatasync`, 0.1 µs |

A figure describes the host named on it. That is the whole of the labelling
requirement; there is no host this project is waiting on before it may record a
number.

---

## Append throughput, one writer

The hardest case for this design: no batching, so the broker's fixed cost is
exposed with nothing to amortise it against.

| Date | Host | Lane | pkg SHA | fmt | Hey SHA | Hey ver | records/s | µs/record | p50 |
|---|---|---|---|---|---|---|---:|---:|---:|
| 2026-09-04 | `docker-on-darwin-m3` | C core | *pre-v3* | v2 | — | — | 1,279 | 782 | — |
| 2026-09-05 | `docker-on-darwin-m3` | C core | `5fb3cd7` | v2 | — | — | 2,665 | 375 | — |
| 2026-09-05 | `darwin-m3` | C core | `81074a3` | v3 | — | — | **247** | 4,049 | 4.000 ms |
| 2026-09-05 | `darwin-m3` | Hey interpreter | `81074a3` | v3 | `e3f6396fd` | 0.99.561a | **201** | 4,964 | — |
| 2026-09-05 | `darwin-m3` | Hey compiled | `81074a3` | v3 | `e3f6396fd` | 0.99.561a | **245** | 4,065 | — |

**Compiled Hey is within 1% of the C core here** — 245/s against 247/s. That is
not a claim that Hey matches C in general: `F_FULLFSYNC` costs 4,020 µs and the
whole operation costs 4,065 µs, so the barrier is 99% of it and there is almost
nothing left for a language to be slow at. The honest reading is that **the
append path is barrier-bound on this host**, and the interpreter's 4,964 µs is
where the language actually shows up: ~900 µs of it.

The two Docker rows are on a different host and a different format and are here
for the trend, not for comparison with the rows below them.

## Replay throughput, one reader

No barrier, so this is where a language has nowhere to hide. **This is the row
to watch as Hey improves.**

| Date | Host | Lane | pkg SHA | Hey SHA | Hey ver | records/s | µs/record |
|---|---|---|---|---|---|---:|---:|
| 2026-09-05 | `darwin-m3` | Hey interpreter | `81074a3` | `e3f6396fd` | 0.99.561a | 1,108 | 902 |
| 2026-09-05 | `darwin-m3` | Hey compiled | `81074a3` | `e3f6396fd` | 0.99.561a | **57,314** | **17** |

**53× between the two lanes.** Compiled Hey reads a record in 17 µs including
the FFI crossing, payload copy and CRC identity computation.

## Against SQLite, by concurrency

The question this package exists to answer. Both engines on the same host and
the same barrier, or the comparison is meaningless — see
`BENCHMARK-2026-09-04-linux-vs-sqlite.md` for why the first attempt at this was
worthless.

| Date | Host | pkg SHA | Writers | SQLite/s | Journal/s | Ratio | SQLite p99 | Journal p99 |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 2026-09-04 | `docker-on-darwin-m3` | *pre-v3* | 1 | 1,630 | 1,279 | **0.78×** | 1.9 ms | 1.5 ms |
| 2026-09-04 | `docker-on-darwin-m3` | *pre-v3* | 4 | 1,061 | 3,484 | **3.28×** | 3.0 ms | 1.9 ms |
| 2026-09-04 | `docker-on-darwin-m3` | *pre-v3* | 8 | 944 | 7,628 | **8.08×** | 2.3 ms | 2.2 ms |
| 2026-09-04 | `docker-on-darwin-m3` | *pre-v3* | 32 | 797 | 24,305 | **30.51×** | 532 ms | 2.5 ms |

SQLite gets *slower* as writers arrive (1,630 → 797) because a committing writer
holds the WAL write lock across its `fdatasync`. The journal goes the other way
(1,279 → 24,305) because more concurrent callers mean a bigger batch under one
barrier. The tail is the sharper story: at 32 writers, 532 ms against 2.5 ms.

**Owed on `linux-1165g7`, and the reason it matters:** the 1-writer crossover was
measured where `fdatasync` costs 0.514 ms on a disk that is a file on APFS. With
no batching at one writer, the broker's fixed cost is a constant against a
barrier that gets cheaper on real storage — so **slower storage flatters this
package at one writer**. Expect the 0.78× to move, and treat a *better* ratio on
faster storage as a reason to question the measurement.

## Real Linux, 2026-09-05 — measured by the `linux` actor

Host `linux-1165g7`, package `a6b6c88`, journal on NVMe via
`HEY_DURABLE_LOG_BENCH_PATH`. Median of 3. Full report and raw samples in
`docs/BENCHMARK-2026-09-05-linux-nvme-btrfs.md`.

### Against SQLite, same `fdatasync` barrier

| Writers | Ratio | Note |
|---:|---:|---|
| 1 | **1.01×** | a tie — no batch to amortise |
| 8 | 8.2× | |
| 16 | **16.1×** | SQLite flat at ~110/s; the journal rides one barrier per batch |

SQLite **drops 7–12 writes per repetition to `SQLITE_BUSY` at 16 writers**. The
journal recorded **zero failures anywhere**. That is a robustness difference
independent of the throughput ratio, and arguably the more important half.

### The RAM control, which inverts the verdict

Kept deliberately, because it is the strongest result in the set:

| Journal on | group_commit 1 writer | vs SQLite, 8 writers |
|---|---:|---:|
| tmpfs (RAM) | 132,979 rec/s, p50 **0.007 ms** | **0.50×** |
| NVMe stack | 117 rec/s, p50 **8.5 ms** | **8.2×** |

~1,140× apart — and note the *direction* of the ratio flips. On RAM there is no
barrier to amortise, so group commit's entire reason to exist disappears and
SQLite's simpler path wins. **A benchmark left on `/tmp` would not have reported
a smaller number; it would have reported the opposite architectural verdict.**

### Format v2 against v3

| Build | 1-writer p50 |
|---|---:|
| v2 `88f8914` | 8.67 ms |
| v3 `a6b6c88` | **6.07 ms** |

Parity at 2+ writers. The gain is the solitary-writer window skip, not the
format. **E4 confirmed: the 56→64 byte frame costs nothing** — the path is
barrier-bound, so eight more bytes per frame disappear under a 6 ms flush.

### Replay lag

Resuming cursor flat at 0.99–1.02× as the log doubles. From-origin grows
1.93→2.32× (p50 17.1→30.9 ms) at 16 writers. `resumable-replay-cursor` holds on
Linux.

### Expectations against outcomes

| | Predicted | Measured | |
|---|---|---|---|
| **E1** | Linux `fdatasync` 10–100× *cheaper* than Darwin `F_FULLFSYNC` (4.020 ms); p50 append < 0.5 ms | **~6.1 ms — 1.5× MORE expensive** | **MISSED** |
| E2 | 1-writer SQLite ratio falls from 1.30–1.50×, possibly below 1.0 | 1.01×, a tie | met |
| E3 | 8+ writers stays well above 1, trending to batch size | 8.2× at 8, 16.1× at 16 | met |
| E4 | v3 costs a few percent, >10% means something else is wrong | costs nothing, barrier-bound | met |

**E1 is recorded as missed and is not softened.** The device is NVMe; the
application writes through btrfs CoW, zstd:3 compression, LUKS/dm-crypt and a
real write-back cache flush, so it is nowhere near bare NVMe. Writing the
prediction down before the run is what makes this a result rather than a
rationalisation.

E2's outcome deserves its reframing too: a *dearer* barrier flatters the
1-writer case, because the broker's fixed cost is a smaller fraction of a more
expensive flush. The tie at one writer is therefore an optimistic reading, not a
pessimistic one.

## Reproducing a row

```sh
bin/benchmark <writers> <ops> <max-batch> <window-us>     # C core
bin/benchmark-sqlite <writers> <ops> <max-batch> <window-us>
bin/benchmark-replay-lag
bin/benchmark-hey [records]                                # both Hey lanes
```

Record: date, host id, lane, package SHA, format version, Hey SHA **and**
version, SQLite version, every parameter, and the barrier the platform actually
used. A row missing its SHAs cannot be compared with anything and should not be
added.

## Defects found by measuring

Writing the first Hey-level benchmark surfaced two compiler and stdlib defects
within the hour, both reported to the Hey project:

- **`stage0-build` cannot compile a bare `exit` statement.** It lowers to
  `hey_value_clone(exit)`, which is not valid C. The interpreter runs it
  correctly, so anything gated only by `--run` will not catch it — our own
  `tools/cluster_leader.hey` and `tools/replica_node.hey` are interpreter-only
  today as a result, without anyone having decided that.
- **`Time.rows_per_second` truncates to integer seconds first.** It returns
  **0** for any measurement under a second, and truncates hard above one. It
  silently produced "2000 records/s" for a run that was really 1,108/s. This
  file computes rates in full nanosecond precision instead.

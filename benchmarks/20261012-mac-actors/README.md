# October 12, 2026: native Mac actor measurements

Apple M3 Pro, 12 physical/logical cores, 18 GiB RAM, macOS 26.6.2 (25G83). Eight workers/schedulers per runtime. One warmup excluded; ten measured repetitions, lane order rotated. 396 actual executions passed; 36 supported cells. 27 absent cells (1BRC, CAF, Akka and rejected cooperative prototype) remain NOT_RUN. These are fixture measurements, not full release acceptance.

Hey 599a compiler emitted the same program LLVM for both Hey runtime lanes. The 600a runtime is an unreleased candidate, source2cefcd9e12f8078de3488c985831d699b025f2cc; published599a sourcec645caa3310c77ff47a8f60a58166f40a0f0834b. Compiler ownership moves, VSS and cooperation are not qualified by these runs. Per-run executable and raw-log SHA256 values are in raw-results.tgz. Supplementary LLVM/archive and native runtime identities, Erlang BEAM/VM/launcher identities, reference source hashes and plan declarations are included.

Application throughput/latency uses fixture timing windows. CPU user+system, wall time, RSS and Darwin footprint cover whole process startup and lifecycle. Go/Erlang/Tokio include fan-in producer creation; Hey preconfigures producers before its application timer; Pony also includes collector creation. Shared queues, checksum work and creation/lifecycle semantics differ: see reference-semantics.md. CPU per operation divides whole-process CPU by logical fixture operations. Zero CPU totals mean below collector resolution, not zero CPU cost; do not calculate ratios using them. RSS and footprint are separate observations. Decimal MB means bytes/1,000,000.

1BRC's current billion-row Mac comparison is unmeasured. The site's older Linux 10-million-row sample remains explicitly historical, including unfavorable Hey/C results. CAF and Akka have no validated fixture here. The cooperative runtime was rejected for two reproduced deadlocks and was not executed in this matrix.

Timer scaling is a separate 88-execution study, 10k/20k sleepers at 500ms with1/8workers. A deadline min-heap remains O(log N); this milestone does not close the O(1)-amortized wheel task. Its one-worker memory increase is retained.

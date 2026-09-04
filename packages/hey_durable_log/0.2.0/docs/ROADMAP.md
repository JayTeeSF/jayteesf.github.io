# Roadmap

## 0.1.0 — packaged local-durability core

- Portable C storage core, bounded ingress broker, committed-prefix replay, and
  a Hey ABI-v2 write path with owned durability receipts.
- Adopt `hey_packager >=0.1.6 <0.2.0`: separate package tests
  (`bin/package-check`) from shared validation (`bin/check`), and generate
  deterministic release, registry-publication, checksum and source-handoff
  artifacts through one tool.
- Publish the complete required documentation and an executable documentation
  example.
- Build through the stable `hey native` command; keep `hey_packager` as external
  release tooling rather than a runtime package dependency.
- Run the C gates on Darwin as well as Linux by supplying a portable cycling
  barrier for the broker group-commit proof, and gate the shim itself.

## 0.2.0 — spec-first pass, real durability barrier, five-implementation survey

- Behavioural spec suite (11 invariants) asserted through the public
  `DurableLog` surface, each observed red for its stated reason first.
- **`F_FULLFSYNC` on Darwin.** `fdatasync` there does not flush the drive cache,
  so acknowledgement was not power-loss durable on that platform. Gated per
  platform by `hdl_sync_barrier_name()`. Costs 4x throughput and is correct.
- **A failed durability barrier now poisons the handle** (`HDL_POISONED`).
  Continuing to acknowledge on a descriptor whose fsync has failed is the
  fsyncgate defect; only a reopen, which re-runs recovery, clears it. A failed
  *write* deliberately does not poison, and that distinction is gated.
- An explicitly named native library is honoured or refused, never silently
  substituted with one found through the environment.
- Open failures carry their reason: `durable_log_open_corruption` is now
  distinguishable from `durable_log_open_io` and `durable_log_open_invalid`.
- Quick-start a consumer can follow without reading the source; every snippet
  executed.
- Darwin benchmark with an honest account of its contamination, and
  `CAGENTS-V2-FIT.md` stating what this buys the v2 server and what it does not.
- Five primary-source research briefs in the cagents repository (Redis AOF,
  Valkey, PostgreSQL WAL, SQLite WAL, etcd/Kafka), with the refusals recorded as
  a decision.

## Next, in order, each one test-first

0. **A position back-link in the frame header (format v2)**, which must land
   BEFORE rotation: the v1 chain links CRC *values*, which is
   position-independent and therefore no defence against replaying stale records
   from a reused segment.
1. **Atomically published segment rotation**, with crash tests at every create,
   sync, rename and manifest boundary, following etcd's `cut()` sequence with a
   CRC'd manifest.
2. **Bounded-memory/backpressure soak and real filesystem-exhaustion tests** — a
   genuinely full filesystem, not a mocked `ENOSPC`.
3. **Verified snapshots and restore receipts** before any segment is retired.
4. **Representative-NVMe latency, throughput, queue-depth and replay-lag tests.**
5. **Fenced three-node quorum replication**, with minority refusal, leader-loss,
   catch-up and committed-prefix agreement tests.

Only after (5) can this package claim to survive host or disk loss. Until then
its guarantees are local-process/local-disk and must be described that way.

## Integration boundary

Do not integrate this package as cagents authority until the Hey gate and the
relevant failure/replay gates pass. Cross-project checkpoints belong in
`JayTeeSF/cagents@main_v2/projects/cagents/tasks/durable-mutation-journal`.

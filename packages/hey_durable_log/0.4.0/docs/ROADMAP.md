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

## 0.3.0 - 0.4.0 — format v2 and the segment set

- **Format v2: every frame names the log-global position it was written for**,
  inside its own CRC, and recovery replays a frame only where that name matches.
  v1's chain of previous-frame CRCs is position-independent, so a reused segment
  file could replay its previous life as committed data -- observed doing
  exactly that before the fix. Frame header 48 -> 56 bytes.
- **A journal is a directory of segments**, each named for its index and base
  position, published by a single `rename`. The directory listing is the
  manifest; there is no manifest file, because a manifest is a second thing that
  has to agree with the first.

- **Atomically published segment rotation**, following etcd's `cut()`: the next
  segment is published before the batch that needed it is written, the frame
  chain carries across the seam, and the writer is killed at every one of the
  six steps of the cut. The half a `SIGKILL` cannot reach -- publishing a
  segment whose bytes were never synced -- is gated by failing the barrier
  instead.

- **Backpressure soak and a REAL full filesystem.** `bin/check-enospc` mounts a
  small filesystem, fills it, and runs the journal into the wall; the soak holds
  the ingress queue at its bound for thousands of records and checks the log
  afterwards.

- **Verified snapshots and retirement.** A snapshot is a journal plus a
  reproducible receipt; verification is restore-and-compare; retirement records
  the log's new origin and the chain at the seam before it deletes anything.

- **The load is observable from Hey.** `DurableLog.stats` returns one snapshot
  of records, durable batches, largest batch and the ingress queue's high-water
  mark, so the bounded-queue promise can be checked by the consumer that was
  given it.

- **One writer owns a journal.** Two handles could open the same journal and
  both acknowledge sequence 1, leaving a journal that would not reopen --
  reported by review against 0.2.0 and reproduced unchanged before the fix.

- **Backpressure is a refusal, not a hang.** A submitter can bound how long it
  waits to be admitted, and a refused submission is provably not in the log.

- **Replay lag measured end to end**, with the expectations written down first.
  It exposed two API costs, not the one it looked like: a cursor could not
  resume, AND opening one re-validated the whole log. Fixing both took p50 from
  29.7 ms to 5.0 ms and made it independent of log length.

- **The Hey surface reaches what the C core can do**: resume a replay, choose a
  segment size, snapshot, verify, restore and retire. A package whose consumers
  cannot keep their own disk from filling up is not finished.

- **A follower that fell behind cannot diverge in silence.** It accepts only the
  record that continues its own log, says what it is missing, deduplicates a
  retried record, and a leader sends exactly the gap. The transport is still
  injected: no real peer has ever been contacted.

- **Replication against real peers.** Three processes, three containers, real
  sockets: a majority confirms, a minority is refused, a follower that fell
  behind is healed from the position it reported, and all three nodes then
  replay the identical committed prefix — compared record for record.
- **A real leader hand-off.** A follower campaigns, a majority grants the term,
  the new leader writes, and the old one is fenced by nodes enforcing the term
  they durably recorded. What remains is reconciling the fenced leader's
  divergent tail, and partition as distinct from a stopped process.

## Next, in order, each one test-first
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

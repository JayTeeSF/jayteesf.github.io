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
  they durably recorded.

- **Divergence is detected, not spliced.** A replica compares the identity of
  the previous record — sequence, stream and payload, never the framing, because
  a leader batches and a replica does not — and refuses a record that continues
  its sequence but not its history — and then repaired: the divergent tail is
  discarded, what was discarded is recorded durably first, and the node rejoins.

- **Partition, as distinct from a stopped process.** `bin/check-partition` never
  stops anything: a running follower is cut off with an `iptables` REJECT from
  one address, so it keeps its journal, its address and every other conversation
  it was having. A live node is unreachable from one side of the split and
  answering the other at the same time; a minority can neither commit nor elect
  itself, and does not record the term it lost; the majority does both without
  it; and a heal where both sides wrote at the same sequence reconciles rather
  than splices. It ends by asserting that neither follower ever restarted, which
  is the assertion that keeps it a partition gate — the first run failed it,
  because the follower's thirty-second accept timeout had quietly turned it back
  into a stopped-process test.

- **A receipt names every peer that did not confirm it**, acknowledged or
  refused. A leader that commits two-of-three and cannot say which node was
  absent cannot heal it either, and that is exactly the state a partition leaves
  behind.

- **A solitary writer stops waiting for company that cannot come.** The broker
  held the first record of a batch for the batch window so concurrent callers
  could join it; with one caller that was a wait for something that provably was
  not coming, since a caller blocked in `append` cannot append again. This is
  PostgreSQL's `commit_siblings`, and it was the last accepted-and-unbuilt item
  from the five-implementation survey. One writer went from 1,309 to 2,665
  records/s and p50 from 0.674 to 0.260 ms on Linux, `average_batch` unchanged
  at eight and thirty-two writers, and the ratio against SQLite at one writer
  went from **0.78x to 1.30x**. `DurableLog.stats` reports `window_waits` so a
  consumer can check it rather than believe it.

## 0.5.0 — a follower that holds its journal

- **A journal this process already holds is retained, not reopened.**
  `DurableLog.open_retained` hands back the open journal, reference-counted, so
  a caller that cannot be given a handle can still reach one by naming the path.
  The motivating consumer is a Distributed Hey call handler: Hey has no
  top-level mutable state, no closures, and no synchronous ask an actor could
  answer — re-probed against 0.99.559a and unchanged — so the thing that can own
  a journal cannot answer and the thing that can answer cannot own one. The
  process state lives in the native adapter instead.

  `open` is untouched and still refuses a second opener by name. Retention is a
  separate surface because a shared handle carries the bounds its *first* caller
  chose; asking for different ones is refused
  (`durable_log_open_retained_conflict`) rather than answered with someone
  else's broker. Journals are keyed by device and inode, so two spellings of one
  directory, a symlink, or a twice-mounted volume resolve to one entry instead
  of deadlocking against the writer lock.

- **The follower stopped dropping its writer lock between records.** It opened,
  applied and closed per replication request, which cost a full recovery scan
  each time and — the part that mattered more — left a window in which another
  writer could take the journal it is fencing. It now opens once for the life of
  the process. Measured rather than claimed: `DurableLog.retained_opens` reports
  real opens, and `bin/check-cluster` reads the follower's own count after
  requiring at least two accepted records, because `opens=1` passes trivially
  against a follower that accepted nothing. 2 opens across 2 records became 1.

## Refused, with the reasoning recorded

- **Full-extent segment preallocation**, worth 3.5x on Linux and refused anyway.
  The file's LENGTH is the durable record of the write frontier, and it is
  exactly the metadata whose flush preallocation removes — so inside a
  reservation a torn tail (header written, payload not) is byte for byte a
  damaged frame. Telling them apart needs either etcd's zero heuristic, already
  refused; or PostgreSQL's reading, which silently drops an acknowledged batch
  whose DATA frame was damaged; or a second durable write per batch, which costs
  more than it saves. Implemented, gated, and killed by its own Linux gate:
  `experiment/preallocated-segments`, and decision
  `refuse-full-extent-segment-preallocation-it-deletes-the-writ`.

## Blocked, and on what

- **A real-Linux run.** Every number this project has so far is from a laptop
  or a container on one. Every document names the host that produced it, which
  is the whole of the honesty requirement — a figure is what to expect on
  hardware like the hardware named on it, and was never a durability claim.
  Underway on bare metal now. The one-writer crossover is the point worth
  watching: with no batching at one writer, the broker's fixed cost is a larger
  fraction of a cheaper `fdatasync`, so slower storage flatters this package.
- **A transport that pools its connections.** The leader still connects,
  handshakes, calls and says bye for every replicated record. Distributed Hey
  threads the peer value through every call — `Remote.call` returns an updated
  peer the next call must use — so pooling has to be threaded through
  `DurableLogCluster.append`, the one module whose decision logic must stay
  simple enough to reason about and which the injected-transport specs gate. No
  replication throughput number is quoted anywhere in this package, and this is
  why.

  The FOLLOWER half of this is no longer blocked and is done. Hey still has no
  closures and no synchronous ask an actor could answer — re-probed against
  0.99.559a, unchanged — so the actor the task first proposed still cannot be
  written. Retention moved instead to the native adapter, the layer that is
  allowed process state: `DurableLog.open_retained` hands back the journal this
  process already holds, reference-counted, keyed by device and inode, and
  refusing a caller that asks for it under different bounds. A follower now
  opens once per process and never drops the writer lock between records, which
  closed a window in which another writer could take the journal it was fencing.
  Measured, not asserted: `bin/check-cluster` went from 2 opens across 2
  accepted records to 1.

The guarantees are local-process/local-disk unless quorum replication is what
you actually deploy, and must be described that way.

## Integration boundary

Do not integrate this package as cagents authority until the Hey gate and the
relevant failure/replay gates pass. Cross-project checkpoints belong in
`JayTeeSF/cagents@main_v2/projects/cagents/tasks/durable-mutation-journal`.

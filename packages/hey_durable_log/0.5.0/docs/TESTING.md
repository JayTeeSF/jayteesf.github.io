# Testing

Every change in this package starts with a test that fails for the stated
reason, observed failing before the implementation exists. A regression test that
has never been seen red is decoration: it can just as easily be defending the
defect as catching it. After a fix lands, re-break the implementation
deliberately, watch the test go red, and restore it.

Assert the invariant, not the observation. "The recovered log contains three
records" is an observation. "Recovery publishes only batches with a complete,
checksummed COMMIT frame, and truncates a partial tail to the last committed
boundary" is the invariant, and it is checked at every byte boundary.

## Run the complete package gate

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager" bin/check
```

`bin/check` is `hey_packager`'s shared validation: `hey-package.json`, `VERSION`,
every declared file, the required documentation, the archive-entry pre-flight,
and the executable documentation example. It then runs the package-specific
portion, which is also available directly:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" bin/package-check
```

That gate runs, in order:

1. the version drift guard — the single in-source version literal in
   `adapter.hey` against the `VERSION` file;
2. `make clean check` — the portable-barrier gate, the recovery/concurrency
   gate, and the native adapter gate, compiled `-std=c11 -Wall -Wextra -Werror
   -Wpedantic`;
3. `bin/check-hey` — the generated ABI-v2 dispatcher, `specs/native_spec.hey`,
   and `tools/native_receipt.hey` byte-compared in both the interpreter and the
   stage0-compiled lane.

The C gates truncate a two-batch journal at every byte offset, verify a corrupt
complete frame is never silently skipped, reject valid frames that belong to
another place in the log, inject short writes and failed syncs, send real
`SIGKILL` at write/sync/receipt boundaries **and at every step of a segment
cut**, exercise concurrent append callers, and prove the broker uses fewer
durable batches than records.

The rotation matrix kills the writer at each of the six steps of the cut --
create, mid-header-write, header written, header synced, renamed, directory
synced -- and after each one requires that recovery succeeds, that the set is
either the old one or the new one, that every acknowledged record is still
there, and that the sequence continues rather than restarting. The segment size
is one byte so that every batch cuts: the first version of this gate picked a
threshold that happened to land the cut one append early, the child exited
normally instead of dying, and the matrix was testing nothing.

A `SIGKILL` cannot prove that a segment's bytes were synced before it was
published, because the OS holds written bytes either way. That half is a
separate gate: the header barrier is made to FAIL, and nothing may then appear
in the directory and the batch that needed the new segment must not be
acknowledged. Moving the rename before the sync produces

    FAIL: a segment was published although its bytes were never synced

The stale-frame gates are two, because one of them does not test what it looks
like it tests. `stale_frames_from_a_recycled_segment_test` rebuilds the case a
crash-and-retry actually produces -- identical bytes rewritten into a reused
file, so the checksum chain runs straight into the file's previous life -- and
`an_empty_recycled_segment_replays_nothing_test` covers the reused file whose new
life crashed before writing anything, where the previous life starts at the very
first frame and has no predecessor to contradict it. Deleting the position check
alone leaves the first green and turns the second red; only the second isolates
it. Both were observed red against v1 semantics before the fix landed.

## Bounded admission

Producing a real refusal needs a full queue and a slow disk at the same instant,
and neither can be arranged by asking politely. `max_batch_records` is clamped to
the queue capacity -- the writer never waits for records the queue cannot hold --
so the first version of this gate could not fill the queue at all and refused
nothing. The gate now stalls the durability barrier
(`hdl_test_stall_next_sync_microseconds`): one submission is in the writer's
hands with the disk stalled, the next occupies the only queue slot, and the third
has nowhere to go.

Two assertions, proved red separately, because the second is the one that makes
the feature safe to offer:

    ignore the deadline
      FAIL: a submission that cannot be admitted within its deadline must be
            refused, not blocked: expected busy, got ok
    refuse the caller but admit the record anyway
      FAIL: a refused submission reached the log anyway

A deadline that left the record queued would be worse than blocking, because the
caller would have been told it was refused.

### Why the comparison is a record identity and not a chain

The obvious fingerprint is the frame chain: format v2 already chains every frame
to its predecessor's CRC, so it depends on the whole history and costs nothing to
read. It is also wrong, and the cluster gate would not have caught it.

A leader group-commits many records under one durability barrier. A replica
applies one record per replication request, so it commits them one at a time. The
two logs then hold IDENTICAL records in DIFFERENT frames, and every
framing-dependent value -- the frame CRC, the chain, the byte positions --
differs. A replica comparing chains would refuse every record from a leader that
batches, which is every leader under load. The gate replicates one record at a
time, so leader and follower batch identically there and it looks fine.

`record_identity_ignores_batching_test` is what makes that explicit: three
records in one batch and the same three records in three batches must produce the
same identity. Making the identity depend on the batch id turns it red with

    FAIL: the record identity depends on batching; a replica would refuse every
          leader that batches

## Snapshots and retirement

Retirement is the only operation that deliberately destroys data, so its gates
compare record streams rather than counts: the snapshot's records plus the
surviving journal's must equal the original stream, record for record, with the
sequence unbroken across the seam. A count would match a retirement that dropped
one record and duplicated another.

Four gates, and one of them exists because of what the others could not prove:

- a snapshot restores into a fresh directory and replays the identical prefix,
  and two snapshots of the same prefix produce identical receipts;
- retiring the snapshotted segments keeps every record reachable, and the log
  continues its sequence rather than restarting;
- a snapshot damaged in its bytes retires nothing;
- **a snapshot whose RECEIPT does not match retires nothing.** The damaged
  snapshot is refused several times over -- it cannot even be opened as a
  journal -- so it cannot tell you whether the receipt comparison does anything
  at all. Bypassing verification leaves the damaged-snapshot gate green and
  turns this one red:

      FAIL: a snapshot whose receipt does not match satisfied a retirement

Removing the retirement receipt while still deleting the segments produces

    FAIL: reopen a journal whose prefix was retired: expected ok, got corruption

which is the point of writing it before anything is destroyed.

## Quorum replication, against real peers

`bin/check-cluster` runs three separate processes in three containers on a
Docker network: a leader and two followers, with real sockets between them. It
needs Docker and the prebuilt Hey toolchain image; it is not part of
`bin/check`, for the same reason `bin/check-linux` is not.

Every other cluster test injects the transport. That is right for testing the
DECISION — which is where a distributed log lies about durability — and it
proves nothing about whether a record crosses a link. This gate asserts, in
order: a reachable majority confirms and reports the expected ack count; two of
three is still a majority; a minority is refused by name; and then it reads each
follower's own journal and compares it record for record.

**The last step is the one that matters, and it is the one that can go red on
its own.** A follower rigged to claim durability without applying anything
passes every leader-side check in this gate — acks 3, acks 2, and the minority
refusal all report PASS — and is caught only by its own bytes:

    -- follower b --
    last_sequence=0
    FAIL: follower b does not hold exactly what it acknowledged

That is "a successful reply is never durability", gated rather than asserted.
(With the healing and hand-off phases in place a lying follower is caught earlier
still, by the vacuity guard in the healing phase — "nothing reported itself
behind" — because a follower that claims everything is fine never reports a gap.)

**One trap this gate taught, which cost several unsound re-breaks: Hey comments
are `#`, and `/* ... */` is not a comment.** A re-break annotated that way fails
to parse, so the gate goes red for the annotation rather than for the defect —
which proves nothing at all. Every re-break recorded here was re-run with `#`
comments after that was discovered.

The gate then stops both followers, brings them back holding different amounts
of the log, and requires the leader to HEAL them from what they report:

    behind b at 2
    caught up b sent=2
    behind c at 1
    caught up c sent=3
    PASS healed and quorum_durable sequence=5 acks=3

It then loses the leader entirely: a follower campaigns for term 2, the
surviving node grants it, the new leader writes at its own term, and the old
leader comes back still believing it leads —

    PASS elected term=2 votes=2 quorum=2
    PASS quorum_durable sequence=6 acks=2
    PASS fenced: term=1 newer_term=2

A follower that forgets the term it voted in turns that red, and it is worth
seeing what the failure looks like, because it is the split brain itself:

    FAIL a stale leader acknowledged a write as quorum_durable

It then brings the fenced leader back as a follower. Its sequence continues
perfectly -- which is exactly why the gap check cannot see the problem -- but its
history does not, and the current leader's record must be REFUSED:

    divergent a holding 6
    PASS divergent refused: 1 of 2 peers

Disabling that check turns it red, and the failure is the splice itself: the
rejoining node accepts the leader's history on top of a record nobody else has.

Then it repairs that node rather than leaving it stuck:

    repairing a holding 6
    still disagreeing at 6; discarding back to 5
    discarded on a now at 5
    caught up a from 5 sent=3
    PASS repaired and quorum_durable sequence=9 acks=3

Note what the node reports: BEHIND, not divergent. The leader has written more
records since the divergence, so the sequence gap is what the follower notices
first, and the disagreement only surfaces when the leader tries to close it --
which it does because the catch-up carries the same identity check the live path
does. If it did not, healing a follower would be the way to splice a divergent
history into it.

A repair that reports success without discarding anything turns this red:

    FAIL could not bring a back into agreement

It finally diffs all three record streams, and checks the repaired node's own
`discarded.receipt` for what it threw away. Not lengths -- the records
themselves, because a follower holding a different history of the same length is
exactly the failure a count cannot see. A catch-up truncated to one record turns
this red.

## Partition, as distinct from a stopped process

`bin/check-partition` exists because `bin/check-cluster` makes every failure by
killing a container, and a killed node and a partitioned node are not the same
situation even though a leader cannot tell them apart. **Nothing in this gate is
ever stopped.** Failures are made with an `iptables` REJECT installed inside a
running follower, so the node keeps its address, keeps its journal, stays on the
network, and goes on answering every peer except the one named in the rule. It
needs `docker/Dockerfile.partition` (the cluster image plus `iptables`) and
`--cap-add NET_ADMIN`.

Three choices in it are load-bearing.

**REJECT, not DROP.** DROP is the more realistic partition and it is unusable
here, for a reason that is a real limit of this package rather than a
convenience: `HEY_DURABLE_LOG_REPLICATION_TIMEOUT_MS` bounds `Remote.call`, and
the connect ahead of it — `DistTransport.establish_connect` → `Net.connect` —
takes no timeout at all. Against a DROPPED peer the leader blocks in the kernel's
TCP connect for minutes and nothing this package configures shortens it. The
first draft of this gate isolated the leader on a separate Docker network, which
takes exactly that path, and sat for over a minute on one unreachable peer. That
limit is stated in `README.md`; REJECT keeps the gate about the cluster's
decisions rather than the kernel's retry schedule.

**INPUT only, not INPUT and OUTPUT.** A matching OUTPUT rule looks more
symmetric and silently breaks the gate: the ICMP host-unreachable generated by
the INPUT rule leaves through OUTPUT, so an OUTPUT REJECT swallows the reply that
makes the failure fast and puts the peer back into the kernel connect above. It
is also unnecessary, because replication is entirely leader-initiated.

**Peers by IP, not by name.** `docker network disconnect` drops a container from
the network's DNS, so a name-addressed peer fails to *resolve* — and a resolver
error is not a partition. It also takes the node's address away from the peers on
its own side of the split, which is the one thing a partition must not do.

The gate asserts, with nothing stopped: a majority commits while a live node is
unreachable, and the receipt NAMES the node that was missing; the same
process — not a restarted one — reports how far behind it is and is caught up; a
leader pushed into the minority is refused by name, cannot elect itself, and does
not record the term it lost; the other side of that same split elects a leader
and commits at the same moment, with the vote granted by the very node refusing
to answer the minority; and a heal where both sides wrote at the same sequence
reconciles the minority's record instead of splicing it.

    refused by c: durable_log_replica_unreachable
    PASS quorum_durable sequence=2 acks=2
    ...
    PASS election refused: durable_log_election_lost votes=1 quorum=2
    PASS no term recorded: term=0
    ...
    vote from c granted=true term=2
    PASS elected term=2 votes=2 quorum=2

**The last assertion is the one that makes this a partition gate**, and it is not
decoration. It compares `docker inspect .State.StartedAt` for both followers
against the values captured before the first record. The first run of this gate
failed it, and the reason is worth keeping: `tools/replica_node.hey` accepts with
`HEY_DIST_ACCEPT_MS` defaulting to 30000, so a follower idle for thirty seconds
shuts down. In `bin/check-cluster` the phases run back to back and it never
fires. In a partition gate a node sitting idle and ALIVE is the entire point, so
the harness had quietly turned the partition test back into the stopped-process
test it was written to be different from — and the correctness assertions all
still passed.

Proved red by relaxing the election rule to `votes < 1`:

    FAIL a minority elected itself with 1 of 2
    FAIL: a minority of one elected itself a leader

and, before the leader could name its refusals at all, by the assertion that a
two-of-three commit says which node was absent:

    FAIL: the leader could not say which peer the partition took from it

**A trap this gate found in the harness, which had been there all along:
`exit(1)` is not a thing in Hey.** `exit` is a statement that stops the actor;
there is no function of that name, so `exit(1)` raised "unknown function: exit"
and the resulting crash happened to halt the program — and `heyc` still returned
0. A container that failed every assertion inside `tools/cluster_leader.hey`
exited SUCCESSFULLY. No gate was actually unsound, because `bin/check-cluster`
and `bin/check-partition` both assert by grepping an explicit PASS line per
phase and never look at the status, but a phase added without its own PASS grep
would have failed in silence. The calls are now the bare `exit` statement and
the constraint is written at the top of the tool: **it cannot report failure
through its exit status; every phase must print a PASS line its gate greps
for.**

## Filesystem exhaustion, on a real filesystem

`bin/check-enospc` mounts a small filesystem of its own -- an HFS+ disk image on
Darwin, a tmpfs on Linux (which needs CAP_SYS_ADMIN) -- fills it, hands back a
measured 256 KiB, and runs the journal into the wall. It never falls back to a
simulation: a platform where a real filesystem cannot be mounted reports
`NOT PROVED` and fails.

What it proves: a full disk is refused rather than acknowledged, the committed
prefix survives intact and in order, the journal is still openable afterwards,
and it appends again once space returns. It asserts that the squeeze crossed
several segment cuts, so the cut path -- where a failure has to create a file
rather than extend one -- is exercised too.

Two things this gate learned about itself, both kept:

- **Its first green run was a lie.** It reused a journal left over from the
  previous run, so the acknowledged counter started at zero while the log did
  not. It now refuses to run against a filesystem that already holds a journal.
- **ENOSPC arrives at `write`, not at the barrier — measured on two
  filesystems.** Acknowledging without the barrier leaves this gate green on
  HFS+ AND on Linux tmpfs: the failure never reaches `sync_data`, and the page
  cache serves the bytes back on reopen anyway. No in-process test can prove a
  barrier happened. That claim is gated separately, by fault injection
  (`failed_barrier_poisons_test`), and this gate is proved red by ignoring the
  write failures instead:

      acknowledged 759, recovered 758
      FAIL: the journal did not hold exactly the records it acknowledged

The C core alone, without a Hey toolchain:

```sh
make clean check
```

`HDL_ENABLE_TEST_HOOKS` is set from the Makefile's own `HOOK_CPPFLAGS`, not from
`CPPFLAGS`. It was in `CPPFLAGS` and therefore overridable, so any shell
exporting `CPPFLAGS` for an unrelated library dropped the fault-injection hooks
and the gate stopped building.

## Benchmarks

Benchmarks name the hardware and the parameters; no number is recorded that was
not measured. `docs/BENCHMARK-2026-09-04.md` is the format.

```sh
bin/benchmark 8 250 64 250
```

## Release verification

```sh
bin/release
unzip -tq "dist/hey_durable_log-0.2.0.zip"
unzip -tq "dist/hey_durable_log-registry-publication-0.2.0.zip"
cat dist/SHA256SUMS.txt
```

## Never weaken a gate to make it pass

In particular do not weaken `bin/check-hey`'s interpreter or stage0-compiled
receipts. If a gate is wrong, say so and change it deliberately, with the
reasoning recorded — never quietly.

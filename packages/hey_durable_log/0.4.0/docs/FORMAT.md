# Durable log format v2

The format is explicitly little-endian and never writes native C structs.
All offsets below are bytes from the start of the relevant header.

## The segment set

A journal is a **directory**. Each published segment inside it is a file named

```text
%016x-%016x.seg      (segment index, base position)
```

The two facts recovery needs are therefore in the name, and **the directory
listing is the manifest**. There is no manifest file, which is deliberate: a
manifest is a second thing that has to agree with the first, and every crash
boundary in rotation exists because two things can disagree. etcd reaches the
same conclusion by encoding (sequence, first index) in its WAL filenames --
`research/2026-09-04-etcd-raft-and-kafka-segments.md` in the coordination
repository, §4.1.

A segment is published by one `rename`, and **the cut happens between batches,
never inside one**: when the active segment has reached `segment_size_bytes`
(64 MiB by default), the next segment is published before the next batch is
written, so a batch is never split across two files and a segment that is
larger than the bound is a batch that was larger than the bound. The frame
chain does not restart at the seam -- the previous frame's CRC, the sequence
and the batch numbering carry across it -- so a segment boundary is invisible
to the record stream and visible only to the filesystem.

Segment `i` begins exactly where segment `i-1` ended:
`base[i] == base[i-1] + size(segment i-1)`. That is what makes a frame's
position unique across the whole log rather than only within its own file, and
recovery checks it rather than assuming it. Only the LAST segment may have a
tail to repair; an unfinished tail in an earlier one means something wrote to a
segment after a later one existed, which this design does not permit, and it
fails closed.

Segment 0 must be present. The set is otherwise self-describing, but the only
way to be sure the FIRST segment is not missing is to require it -- so retiring
a segment will have to record the log's new origin in a receipt. Nothing retires
anything yet.

Publication itself is etcd's `cut()` sequence. The segment is built under
`%016x-%016x.seg.tmp`, its header is written and synced, it is renamed into its
final name, and only then is the directory synced. Nothing acknowledgeable is
written into it before it is published, so a crash anywhere in the sequence
leaves either the old set or the new one, and both replay the same committed
records. A file that has not been renamed is not part of
the log: recovery matches the exact published name and walks past everything
else, so a crash between create and rename leaves debris rather than a torn log.

Anything else in the directory -- a half-built segment, an operator's copy, an
unrelated file -- is ignored for the same reason.

## Ownership

A journal has one writer. Opening it takes an exclusive advisory lock
(`flock`) on `journal.lock` inside the directory, and it is taken BEFORE
recovery, because recovery truncates an uncommitted tail: a second opener that
got past this point would destroy work the first owner is still doing.

A second open -- in the same process or another one -- is refused as
`HDL_LOCKED`. POSIX record locks would not do: they are per-process, so a second
open in the same process would be granted the lock it already holds, which is
exactly the reproduction this rule exists to stop. `flock` is also released by
the kernel when the owner dies, so a crash never leaves a journal nobody can
open, and a stale lock file is not something recovery has to reason about.

Readers are not affected: a replay cursor reads through its own descriptors and
snapshots are read-only copies.

## Segment header (64 bytes)

| Offset | Size | Field |
|---:|---:|---|
| 0 | 8 | `HDLGv002` magic |
| 8 | 4 | header size (`64`) |
| 12 | 4 | format version (`2`) |
| 16 | 8 | segment generation |
| 24 | 8 | creation time in Unix nanoseconds |
| 32 | 8 | base position: this segment's first byte, in the log as a whole |
| 40 | 20 | reserved, zero |
| 60 | 4 | CRC32 of bytes 0..59 |

The creating process writes the header, calls the platform durability barrier,
and synchronizes the parent directory before accepting mutations.

**Base position** places the segment in one log-global byte space. A frame's
log-global position is `base_position + its offset in this segment`. A segment
at the start of the log has base position 0. Rotation assigns each new segment a
strictly greater base position, and two live segments never share one.

## Frame header (56 bytes)

| Offset | Size | Field |
|---:|---:|---|
| 0 | 4 | `HDLF` magic |
| 4 | 2 | format version |
| 6 | 2 | type: DATA (`1`) or COMMIT (`2`) |
| 8 | 4 | complete frame length |
| 12 | 4 | payload length |
| 16 | 8 | sequence (COMMIT uses the batch's last sequence) |
| 24 | 8 | batch id |
| 32 | 8 | stream id (zero for COMMIT) |
| 40 | 8 | frame position: this frame's log-global byte position |
| 48 | 4 | preceding frame's CRC32 |
| 52 | 4 | CRC32 of header with this field zero, then payload |

The previous-frame CRC detects deletion and reordering as well as accidental
damage. It is not a cryptographic authentication mechanism.

**Frame position is why this is v2.** The v1 chain of previous-frame CRCs is
position-independent: a frame carrying the right previous CRC validates wherever
it physically sits. That was harmless while one segment only ever grew. It stops
being harmless the moment a segment file is reused, recycled or preallocated,
because the file then holds complete, correctly-checksummed frames that belong
to an earlier place in the log, and nothing in a v1 frame says so. PostgreSQL
lives with exactly that file -- it recycles WAL segments with a bare rename and
no zeroing -- and Tom Lane put the consequence plainly on pgsql-hackers,
2018-01-12: "recognizing that the new record has an old xl_prev is our ONLY
defense against replaying stale data."

Each frame therefore names the log-global position it was written for, and the
name is inside the frame CRC, so it is as hard to forge by accident as the
payload. Recovery replays a frame only where that name matches.

Two things follow, and both were tested by observing the gate go red without
them:

- Naming the position of the PREVIOUS frame, PostgreSQL's `xl_prev`, would not
  have been enough here. A segment recycled into a new position, whose new life
  crashed before writing anything, holds its whole previous life starting at the
  first frame -- where there is no predecessor to disagree with. PostgreSQL
  catches that case with a second mechanism, the page header's own address
  (`xlp_pageaddr`); a frame that names its own position is that mechanism, and
  it subsumes the back-link.
- The position must be log-global rather than an offset within the segment. A
  recycled file reuses the same offsets, so a within-segment offset would match
  the stale frames exactly and prove nothing. The base position in the segment
  header is what makes the name global.

## Commit payload (24 bytes)

| Offset | Size | Field |
|---:|---:|---|
| 0 | 8 | first sequence |
| 8 | 8 | last sequence |
| 16 | 4 | DATA frame count |
| 20 | 4 | CRC32 over the ordered DATA-frame CRC values |

An acknowledgement is legal only after the COMMIT frame and all preceding
DATA frames have completed `fdatasync`.

## Recovery

The scanner validates the segment header, every complete frame, sequence and
batch monotonicity, the previous-frame chain, and the commit summary.

- A physically short final header or frame is a torn tail and is truncated to
  the last valid COMMIT boundary.
- Complete, valid DATA frames without a following COMMIT are truncated to that
  same boundary.
- A malformed or checksum-invalid complete frame is corruption and fails
  closed. Recovery does not silently discard it.
- A complete, checksum-valid frame that names a position other than the one it
  occupies is corruption and fails closed. It is a frame from somewhere else --
  a previous life of the file, or a copy spliced in -- and it is never published
  as committed data.

  This is the strict reading, and it holds because **this package does not
  recycle segment files**: a retired segment is deleted, and a preallocated
  segment is zero-filled before use, so no legitimate sequence of events puts a
  foreign frame in a live segment. If recycling is ever adopted -- and the
  Linux preallocation work is where that argument will come up -- a foreign
  frame in the tail becomes an EXPECTED condition, and this rule must change
  with it: a mismatch at or after the last committed boundary would then be
  end-of-log rather than corruption, which is what PostgreSQL does and is safe
  only because nothing acknowledged can lie beyond that boundary. Changing the
  strictness without changing the recycling decision, in either direction, is
  the error to avoid.
- Scan callbacks receive records only after their COMMIT validates.
- A replay cursor snapshots the last validated COMMIT offset when it opens.
  Later appends are intentionally invisible to that cursor, so a materializer
  can apply a finite, committed prefix and then open another cursor -- and the
  next cursor RESUMES, at a position every record carries, so catching up does
  not mean re-reading. A position that is not a frame boundary is refused rather
  than resynchronised: guessing where a record starts is how a reader invents
  one. A position below the log's origin is reported as retired, because those
  records are in a snapshot rather than gone.
- A complete batch found after a crash before the caller received its receipt
  is retained. The caller must retry with an application idempotency key; an
  error or lost response is not proof that the mutation was absent.

Sequence numbers are segment-global. `stream_id` lets an upper layer maintain
one ordered reducer per cagents workspace while fixed journal partitions
provide parallelism between workspaces.

## Snapshots and retirement

A snapshot is a journal: the same segment files under the same names, in a
directory of its own, plus `snapshot.receipt`. That is deliberate -- it means a
snapshot is validated by exactly the code that validates a journal, rather than
by a second reader written for the occasion, which is where a divergence would
hide. Only COMPLETE segments are snapshotted; the segment still being appended
to is not one, and can never be retired.

```text
hey_durable_log snapshot 1
segments <first index> <last index>
positions <first base> <end position>
sequences <first sequence> <last sequence>
records <count>
digest <CRC32 over the ordered record stream>
crc <CRC32 of the lines above>
```

Fixed-width hex, no timestamp and no paths, so the same committed prefix
produces the same receipt bytes every time: two operators can compare receipts
instead of journals, and a receipt that changed means the prefix changed. The
digest covers sequence, stream id and payload of every record -- a statement
about the record stream a consumer replays, not about how it was batched.

**Verified means restored and compared.** `hdl_snapshot_verify` reads the
snapshot back as a journal and checks what it actually replays against what the
receipt claims. A snapshot whose bytes are damaged fails earlier than that -- it
cannot be opened at all -- so the case that decides whether the comparison is
load-bearing is a readable snapshot whose receipt lies, and that is the one the
gate uses.

Retirement is the only operation here that deliberately destroys data. It
verifies the snapshot, proves the snapshot is a prefix of THIS log (ending
exactly where the surviving segments begin, and chaining into the first
surviving frame), records the retirement, and only then deletes:

```text
hey_durable_log retirement 1
next <first surviving index> <its base position>
chain <last sequence> <last batch id> <previous frame CRC>
snapshot <digest of the snapshot that justified this>
crc <CRC32 of the lines above>
```

Once segment 0 can be absent, "the set begins at 0" stops being the rule that
proves nothing was lost, so `retired.receipt` carries the whole recovery state at
the seam. Without the chain it holds, the first surviving frame refers to a
frame nobody has and a perfectly good journal reads as corruption. Recovery
ignores any segment below `next` even if a crash between recording and deleting
left it on disk, which is why the receipt is written first.

## Compatibility

v2 is a byte-format break, taken deliberately while the only released version is
0.2.0 and no v1 journal exists outside this repository's own test runs. The v1
frame header had no spare room, and taking the break after segment rotation had
written v1 segments in the field would have been far more expensive. A v1
segment header does not carry the v2 magic, so a v2 build refuses to open it
rather than misreading it; there is no conversion path and none is owed.

## Not yet in v2

- segment retirement, and the receipt that would have to record the log's new
  origin when segment 0 stops existing;
- preallocated segments (a v3 field: recovery would have to tell reserved space
  from a damaged frame, which the zero-detection heuristic this project refuses
  etcd for is the cheap way to do);
- SHA-256/BLAKE3 authentication for hostile-corruption detection;
- quorum replication and replica catch-up;
- encryption at rest;
- adaptive microbatch timing (the current broker has a bounded queue and a
  fixed configurable window);
- a Hey-visible segment size (rotation is transparent through the Hey surface
  and uses the default bound; the knob is C-level only).

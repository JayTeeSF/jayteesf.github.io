# Durable log format v1

The format is explicitly little-endian and never writes native C structs.
All offsets below are bytes from the start of the relevant header.

## Segment header (64 bytes)

| Offset | Size | Field |
|---:|---:|---|
| 0 | 8 | `HDLGv001` magic |
| 8 | 4 | header size (`64`) |
| 12 | 4 | format version (`1`) |
| 16 | 8 | segment generation |
| 24 | 8 | creation time in Unix nanoseconds |
| 32 | 28 | reserved, zero |
| 60 | 4 | CRC32 of bytes 0..59 |

The creating process writes the header, calls `fdatasync`, and synchronizes
the parent directory before accepting mutations.

## Frame header (48 bytes)

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
| 40 | 4 | preceding frame's CRC32 |
| 44 | 4 | CRC32 of header with this field zero, then payload |

The previous-frame CRC detects deletion and reordering as well as accidental
damage. It is not a cryptographic authentication mechanism.

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
- Scan callbacks receive records only after their COMMIT validates.
- A replay cursor snapshots the last validated COMMIT offset when it opens.
  Later appends are intentionally invisible to that cursor, so a materializer
  can apply a finite, committed prefix and then open another cursor.
- A complete batch found after a crash before the caller received its receipt
  is retained. The caller must retry with an application idempotency key; an
  error or lost response is not proof that the mutation was absent.

Sequence numbers are segment-global. `stream_id` lets an upper layer maintain
one ordered reducer per cagents workspace while fixed journal partitions
provide parallelism between workspaces.

## Not yet in v1

- segment rotation and an atomically published manifest;
- SHA-256/BLAKE3 authentication for hostile-corruption detection;
- quorum replication and replica catch-up;
- encryption at rest;
- adaptive microbatch timing (the current broker has a bounded queue and a
  fixed configurable window);
- broader kill-point coverage around segment rotation (the current test build
  covers `SIGKILL` during write, immediately before sync, and immediately after
  sync but before receipt publication, plus short writes and failed barriers).

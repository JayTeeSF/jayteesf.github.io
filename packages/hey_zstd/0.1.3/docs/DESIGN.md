# Design

Bounded zstd compression and decompression streams over exclusive private files.

Keep bounded immutable byte batches between layers. Drivers own engine-specific handles and bulk-load mechanics; the record interface owns capability dispatch; codec packages own their wire formats and buffers. Never load a whole dataset into a collection. Errors must prevent complete-artifact publication.

Compression uses a single independent zstd frame with content checksum. Outputs are exclusive mode-0600 files; symlinks and overwrites are refused. Reads enforce bounded output blocks, a total expansion limit and a decoder window ceiling. Truncated input, concatenated frames and trailing bytes are rejected. Callers publish only after successful completion and checksum validation.

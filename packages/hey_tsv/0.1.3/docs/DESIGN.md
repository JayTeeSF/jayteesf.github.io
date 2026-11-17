# Design

Lossless escaped UTF-8 TSV encoding from bounded driver-neutral HYR1 row batches.

Keep bounded immutable byte batches between layers. Drivers own engine-specific handles and bulk-load mechanics; the record interface owns capability dispatch; codec packages own their wire formats and buffers. Never load a whole dataset into a collection. Errors must prevent complete-artifact publication.

HYR1 is an in-process row-batch contract: ASCII magic HYR1, little-endian uint32 row count and column count, then row-major uint32 byte lengths and exact bytes. UINT32_MAX represents SQL NULL; zero length represents an empty value. Every frame is validated before output. UTF-8 is validated without normalization. Escapes are backslash, TAB, LF, CR, NUL and Ctrl-Z; bare backslash-N represents SQL NULL. Binary columns require an explicit consumer transform rather than guessing UTF-8.

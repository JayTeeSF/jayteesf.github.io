# Design

Driver-neutral backup and bulk-restore orchestration using the hey_record stream capability.

Keep bounded immutable byte batches between layers. Drivers own engine-specific handles and bulk-load mechanics; the record interface owns capability dispatch; codec packages own their wire formats and buffers. Never load a whole dataset into a collection. Errors must prevent complete-artifact publication.

The core imports the generic record capability, not a particular database driver. Adapters without bounded streaming or bulk-file loading return an explicit unsupported result. Current keyset traversal requires a selected positive integer key; other key shapes need a declared traversal implementation. The current transport helper does not implement durable application merge receipts, privacy transforms, remote object storage or full crash-resume semantics. Those remain separate implementation work; do not advertise them as available.

## Backup limits and progress

`backup_table(connection, table, codecs, limits, directory)` writes one compressed chunk per `limits.chunk_rows` keyset page, each capped at `limits.max_chunk_bytes` decoded bytes. Two optional limits support multi-table producers:

- `spool_budget_bytes` with `spooled_bytes` (bytes already on disk from earlier tables) caps the compressed bytes on disk. Near the end of the budget, a chunk's decoded cap shrinks to the remaining budget, because the decoded size bounds the compressed size. Exceeding it fails with `spool_budget_exceeded`. The result's `spooled_bytes` is the new running total to pass to the next table.
- `on_chunk` with an optional `on_chunk_context` is called as `on_chunk(context, progress)` after each completed chunk, where `progress` holds `source`, `file`, `rows`, `bytes` and `spooled_bytes`. Use it for a lease heartbeat during long extractions. An error result stops the backup.

Failed and empty chunk files are removed, so a failed table leaves no partial chunk behind.

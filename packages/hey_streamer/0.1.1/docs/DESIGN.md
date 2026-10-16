# Design

Driver-neutral backup and bulk-restore orchestration using the hey_record stream capability.

Keep bounded immutable byte batches between layers. Drivers own engine-specific handles and bulk-load mechanics; the record interface owns capability dispatch; codec packages own their wire formats and buffers. Never load a whole dataset into a collection. Errors must prevent complete-artifact publication.

The core imports the generic record capability, not a particular database driver. Adapters without bounded streaming or bulk-file loading return an explicit unsupported result. Current keyset traversal requires a selected positive integer key; other key shapes need a declared traversal implementation. The current transport helper does not implement durable application merge receipts, privacy transforms, remote object storage or full crash-resume semantics. Those remain separate implementation work; do not advertise them as available.

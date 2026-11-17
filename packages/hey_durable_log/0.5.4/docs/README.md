# hey_durable_log 0.2.0

Crash-safe, bounded, group-commit mutation journal for Hey services.

The root `README.md` contains the public package overview and the precise
statement of what this journal currently guarantees. This documentation
directory is copied intact into every registry publication by `hey_packager`.

## Release controls

```sh
bin/check
bin/release
bin/publish --no-commit
bin/source-zip
```

See `GETTING_STARTED.md`, `DESIGN.md`, `TESTING.md`, and `ROADMAP.md` for
package-specific guidance.

## Scope of the guarantee

These are local-process/local-disk guarantees. Surviving loss of the host or the
disk requires quorum replication before acknowledgement, which is not yet
implemented — see `ROADMAP.md`. Do not describe this package as
crash-and-host-durable until item 5 of the roadmap lands with its gates.

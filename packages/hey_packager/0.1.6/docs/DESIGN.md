# Design

## Boundary

Hey core owns manifest validation, deterministic package archives, release
metadata, integrity verification, installation, and lockfiles.

`hey_packager` owns author-facing policy:

- standard package repository controls;
- required public documentation;
- source handoff ZIPs;
- release checksums;
- website registry layout;
- optional Git commit after immutable publication.

The default registry path is user policy and therefore does not belong in the
language runtime or standard library.

## Immutability

Publication refuses to replace `NAME/VERSION`. Fixes require a new version.
The command commits only the new package-version directory and never pushes.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.

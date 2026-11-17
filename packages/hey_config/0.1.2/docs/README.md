# hey_config 0.1.1

Typed configuration layers, environment overlays, secret references, and validation receipts shared by every Hey application type.

This is a Milestone 0 prototype and has not been published to the package
registry. The root `README.md` is the overview; this directory is what
`bin/release` copies into a registry publication.

## Module

`src/main.hey` defines `HeyConfig`. `docs/examples/basic.hey` shows a call.

## Release controls

```sh
bin/check
bin/bump patch --dry-run
bin/release
```

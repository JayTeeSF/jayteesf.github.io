# hey_packager 0.1.0

Release and immutable website-publication porcelain for third-party Hey packages.

The package validates code and required documentation, invokes Hey's generic
`package pack` command, writes SHA-256 checksums, creates a registry-ready tree,
and publishes it beneath `packages/NAME/VERSION` without replacing an existing
release.

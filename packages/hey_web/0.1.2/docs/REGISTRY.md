# Proposed Hey package registry record

A registry entry should be immutable per package version and contain enough information to resolve without executing package code:

```json
{
  "kind": "package_release",
  "name": "hey_web",
  "version": "0.1.0",
  "modules": ["main", "server", "client", "client_cli", "package"],
  "dependencies": [],
  "source_checksum": {"algorithm": "sha256", "value": "..."},
  "archive": {
    "url": "https://registry.example/hey_web/0.1.0/hey_web-0.1.0.zip",
    "checksum": {"algorithm": "sha256", "value": "..."}
  },
  "source": {"kind": "git", "repository": "...", "tag": "v0.1.0"},
  "yanked": false
}
```

Two checksums are intentional:

- **Archive checksum** proves the downloaded transport bytes.
- **Source checksum** proves the exact ordered module contents installed into the Hey cache.

A client should:

1. resolve an exact version into a lockfile;
2. download into a temporary path;
3. verify the archive checksum;
4. reject absolute paths, `..` traversal, symlink escapes, duplicate entries, and unexpected files while unpacking;
5. verify the source checksum and manifest module list;
6. validate transitive dependencies against the lockfile;
7. atomically rename into `.hey/packages/<name>/<version>`.

Yanking prevents new resolution but must not break an existing lockfile. Signatures, transparency logs, and provenance attestations can be layered on later without replacing SHA-256 integrity checks.

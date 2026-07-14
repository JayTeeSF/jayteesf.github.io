# Packaging and distribution

## Repository vs installed cache

The git repository contains editable package source under `src/`. A consuming app never imports through a relative path into this repository. Instead, an installer verifies the locked SHA-256 source digest and copies the immutable modules into:

```text
<app>/.hey/packages/hey_web/0.1.0/
```

The app then imports `pkg:hey_web@0.1.0/server` or another public module.

## Release artifact

Generate the installable archive and update its release record with:

```sh
./bin/package-zip
```

The archive contains only the package manifest, dependency lock, source checksum, README, and public `src/*.hey` modules. It deliberately excludes `.git`, specs, build output, and release metadata. Excluding the release record avoids a circular archive-checksum dependency.

The command writes:

- `~/Downloads/hey_web-0.1.0.zip` by default;
- `releases/hey_web-0.1.0.json` with the exact archive SHA-256.

Set `OUT_DIR` to choose another artifact directory.

## Two checksum layers

- **Source checksum:** hashes ordered public module names and exact module bytes. This is what the app lock verifies before importing installed code.
- **Archive checksum:** hashes the downloaded zip bytes. This catches transport corruption or substitution before extraction.

A remote installer must verify the archive checksum first, extract safely, then verify the source checksum before atomically promoting the package into the cache.

## Versioning policy

- Patch: compatible bug fixes.
- Minor: backward-compatible functions/modules.
- Major: incompatible public API changes.

Never rewrite released public module source. Any public module change requires a new version and source checksum. Release metadata or repository-only tooling may be improved without changing the immutable package source payload.

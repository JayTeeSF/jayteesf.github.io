# Roadmap

1. Consume an installed `hey_packager` package command without requiring a sibling checkout.
2. Add signed release attestations and optional GitHub release publication.
3. Add registry index generation after multiple package consumers prove the shape.
4. Add reproducibility receipts comparing two independently generated archives.
5. Keep registry hosting and credentials outside Hey core.

## 0.1.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.1.2 — validation hardening

- Verify the package manifest before package-specific integration checks.
- Refuse unsafe release output directories before recursive cleanup.
- Run documentation examples from the configured Hey checkout so all stdlib modules resolve consistently.
- Mark source handoff archives explicitly as unverified.

## 0.1.7 — canonical adoption

- Adopts hey_packager (canonical bin/check, bin/bump, bin/release, bin/publish); release no longer publishes.
- `bin/bump` rewrites the manifest version with awk (BSD sed silently did nothing) and verifies VERSION and hey-package.json agree.
- Documentation states the adoption range `>=0.1.1 <0.2.0`: release builds, publish commits to the registry.

## 0.1.8 — complete bumps, checked releases, one tool for every package

- `hey-version-files` declares every other copy of the version; `bin/bump` moves them, reads them back, and restores on failure. `bin/check` fails when a declared copy is stale.
- `bin/package-bump OLD NEW` hook for package-specific bump steps.
- `bin/bump --dry-run` and `bin/bump --normalize STALE`; a higher, unpublished version is required; a redundant `.` root is accepted by every command.
- `bin/release` and `bin/publish` run the full check first. Overrides: `release --no-check`, `publish --emergency-publish-unchecked` (recorded in the registry commit).
- `bin/update_packages` replaces the v3 `hey-update-packages` wrapper: exact pins, lock refresh against the local registry, import references, verify, check.
- Bump keeps file modes (0.1.7 left `hey-package.json` at 0600).

# Roadmap

## 0.1.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.1.4 — package compatibility

- Remove `hey_packager` from runtime dependencies.
- Depend on repaired `hey_mobile >=0.1.4` and `hey_web >=0.1.4` releases.
- Require `hey_packager >=0.1.4 <0.2.0` as external release tooling.

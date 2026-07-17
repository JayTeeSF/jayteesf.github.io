# Roadmap

## 0.1.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.1.2 — package compatibility

- Remove `hey_packager` from runtime dependencies.
- Depend on the repaired `hey_mobile >=0.1.2 <0.2.0`.
- Require `hey_packager >=0.1.2 <0.2.0` as external release tooling.

# Roadmap

## 0.2.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.2.5 — package compatibility

- Keep `hey_packager` as external release tooling rather than a runtime dependency.
- Update examples and handoff notes for `hey_sqlite3@0.2.5` and `hey_mysql@0.2.5`.
- Require `hey_packager >=0.1.2 <0.2.0` for HEY_ROOT-correct documentation checks.

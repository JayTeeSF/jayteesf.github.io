# Roadmap

## 0.2.2 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.2.4 — current native command and package controls

- Build through the stable `hey native` command rather than the removed `bin/hey-native` path.
- Keep `hey_packager` as external release tooling rather than a runtime dependency.
- Retain Connector/C provider and TLS API probing in this package.
- Require `hey_packager >=0.1.2 <0.2.0` for HEY_ROOT-correct documentation checks.

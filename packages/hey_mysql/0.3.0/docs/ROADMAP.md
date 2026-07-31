# Roadmap

## 0.2.2 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.2.5 — native command and package controls

- Build through the stable `hey native` command rather than the removed `bin/hey-native` path.
- Keep `hey_packager` as external release tooling rather than a runtime dependency.
- Retain Connector/C provider and TLS API probing in this package.
- Require `hey_packager >=0.1.2 <0.2.0` for HEY_ROOT-correct documentation checks.

## 0.2.6 — canonical import casing

- Import `./native.hey` with canonical on-disk filename casing in `main.hey` and `adapter.hey`, as required by Hey compiler >=0.99.445a.

## 0.2.7 — parameter interpolation position fix

- Fix `?` placeholder substitution so a parameter value containing a literal question mark can no longer hijack the next placeholder position (silent SQL corruption) or trip a spurious `mysql_bind_count_mismatch` "fewer parameters than placeholders" error when it is the last parameter. Interpolation now tracks its position in the original SQL and never re-scans substituted values.
- Add spec coverage for question-mark-bearing parameter values and both bind-count mismatch errors (`specs/interpolate_spec.hey`, extended `specs/api_spec.hey`).

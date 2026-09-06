# Roadmap

## 0.3.3 — WAL/synchronous throughput defaults + green package gate

- **Write throughput.** `Sqlite3.connect` now applies `PRAGMA journal_mode` and
  `PRAGMA synchronous` (defaults `WAL` and `NORMAL`) after opening. The prior
  default (rollback journal + `synchronous=FULL`) fsync'd on every autocommit
  write — ~10ms/op, ~95 ops/s. WAL+NORMAL takes the per-write fsync off the hot
  path; durability moves to the checkpoint/OS-crash boundary, which is exactly
  right when a `hey_durable_log` journal fronting the projection already owns
  durability. Both are overridable per connection (`{journal_mode: 'DELETE',
  synchronous: 'FULL'}` for self-contained durability; `''` keeps SQLite's
  default). Values are validated as bare keywords (letters only) — a malformed
  value is refused (`sqlite3_pragma_invalid`), closing a PRAGMA-injection door.
- **Package gate green.** `specs/load_extension_spec.hey` asserted a successful
  `Sqlite3.connect` Result through `Minispec.to_be_ok`; a successful open's value
  is the live connection record whose fields are callables, and Minispec's value
  rendering `to_json`'d it → `JSON cannot encode a function`, failing `bin/check`.
  The spec now asserts the boolean (`to_be_true(opened.ok)`) — a test must not
  serialize a live handle. The underlying Minispec callable-detail fix is owned
  upstream on the Hey project.

## 0.2.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.2.2 — current native command and package controls

- Build through the stable `hey native` command rather than the removed `bin/hey-native` path.
- Keep `hey_packager` as external release tooling rather than a runtime package dependency.
- Validate interpreter and native-C SQLite receipts; keep LLVM as an explicit opt-in probe.
- Require `hey_packager >=0.1.2 <0.2.0` for HEY_ROOT-correct documentation checks.

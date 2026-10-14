# Roadmap

## 0.5.0 — JSON built by SQLite

- `Sqlite3.query_json(connection, sql, parameters)`: SQLite's JSON text from a
  one-column statement, unparsed; `ok(nil)` for no rows.
- `Sqlite3.query_rows_json` / `query_row_json` (and `_with` options for
  `json_columns`): any SELECT's rows as a JSON array (or the first row as an
  object) built inside SQLite; ORDER BY kept; column names quoted as string
  literals only; duplicate names and BLOBs refused.
- Native: `hey_sqlite3_json_value()` SQL guard on every connection, and one
  native call that writes the wrapper SQL (`native/hey_sqlite3_json.c`).
- Next, if asked for: an opt-in BLOB encoding (hex/base64) for the rows calls.

## 0.4.0 — statement cache, checkpoint, sizing pragmas

- Per-connection prepared-statement cache under query/execute
  (`statement_cache: false` opts out); `Sqlite3.checkpoint`; validated
  `cache_size`, `mmap_size`, `wal_autocheckpoint`.

## 0.3.3 — WAL/synchronous throughput defaults + green package gate

- **Write throughput.** `Sqlite3.connect` now applies `PRAGMA journal_mode` and
  `PRAGMA synchronous` (defaults `WAL` and `NORMAL`) after opening. The prior
  default (rollback journal + `synchronous=FULL`) fsync'd on every autocommit
  write — ~10ms/op, ~95 ops/s. WAL+NORMAL takes the per-write fsync off the hot
  path; durability moves to the checkpoint/OS-crash boundary, which is suitable
  when an application-owned journal fronting the projection already owns
  durability. hey_sqlite3 deliberately depends on no journal package. Both are
  overridable per connection (`{journal_mode: 'DELETE',
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

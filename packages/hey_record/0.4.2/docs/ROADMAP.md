# Roadmap

## 0.4.1 — store() surfaces the durability receipt; hey_sqlite3 0.3.3 compat

- **Contract D1.** `HeyRecordStore.store()` ended in `return Result.ok(value)`,
  echoing the input and discarding the write result — and with it the `durable:
  receipt` the durable-log-fronted adapter attaches (append receipt: fdatasync'd,
  sequence-numbered). A `store()`-level caller could not observe the
  acknowledgement point, so a benchmark had to timestamp the ack one layer down
  at `conn.execute_params`. store() now propagates the write result, so
  `store(...).value.durable` carries the receipt on the durable adapter. Plain
  sql/postgres/mysql carry the applied result without a `durable` field; no
  caller reads `store().value` as the record (it is read back via `fetch`), so
  this is additive.
- **hey_sqlite3 0.3.3.** Composes with hey_sqlite3 0.3.3, whose projection now
  defaults to WAL + `synchronous=NORMAL` (per-write fsync off the hot path).
  The durable adapter is unchanged: the caller opens the projection connection
  and can pass `synchronous:'OFF'` for a pure projection, since the
  hey_durable_log journal owns durability. DECISION: hey_durable_log is NOT
  bundled into hey_sqlite3 — the SQLite adapter stays a clean driver, and the
  journal+projection composition lives here in the durable adapter.

## 0.2.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.2.5 — package compatibility

- Keep `hey_packager` as external release tooling rather than a runtime dependency.
- Update examples and handoff notes for `hey_sqlite3@0.2.5` and `hey_mysql@0.2.5`.
- Require `hey_packager >=0.1.2 <0.2.0` for HEY_ROOT-correct documentation checks.

## 0.3.0 (target) -- record store and migration ledger

- `HeyRecordStore` (store.hey): JSON record store over collection + id, file and injected-connection SQL backends, extracted from RecallCoach's proven RecallStorage shape.
- `HeyRecordMigrate` (migrate.hey): schema_migrations-style ledger with idempotent `ensure`.
- `HeyRecordDialect.named` refuses unknown dialect names instead of silently defaulting to sqlite3.
- `bin/check` gains a compiled-lane receipt: interpreter and heyc-built binary output must be byte-identical.
- Later slices: store probe/inventory tooling, migration locking and down execution, adapter store-conformance receipts in `hey_mysql`/`hey_sqlite3`, and a compiled-lane fix or replacement for `HeyRecordModel.find`.

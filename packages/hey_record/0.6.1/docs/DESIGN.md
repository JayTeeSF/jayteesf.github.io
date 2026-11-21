# Design: hey_record

## Connection contract

An adapter connection is an immutable object containing a dialect name and callable fields:

- `query(connection, sql)` and `query_params(connection, sql, parameters)`;
- `execute(connection, sql)` and `execute_params(connection, sql, parameters)`;
- optional `begin`, `commit`, `rollback`, and `close`.

The driver returns `Result` values containing `rows`, `columns`, `changes`, and `last_insert_id` where applicable.

## SQL plans

`HeyRecordSql` validates and quotes identifiers, then returns SQL and values separately. Empty `IN` lists become `1 = 0`. Unscoped update/delete operations fail. Raw order expressions are available only through the explicitly named `order_raw` escape hatch.

## Models

A model is a descriptor around a connection, table, primary key, and options. It does not hide global connections or mutable object identity.

## Migrations

DDL helpers accept a dialect descriptor so SQLite `AUTOINCREMENT` and MySQL `AUTO_INCREMENT` remain adapter-aware. Migration locking and down execution are future package slices.

## Migration ledger (`migrate.hey`)

`HeyRecordMigrate` keeps `schema_migrations` bookkeeping: which migration ids have been applied, plus an idempotent `ensure(target, migrations)` that applies the unapplied ones in order. SQL targets keep the ledger in a `schema_migrations(version PRIMARY KEY, applied_at)` table on an injected connection; file targets keep it as `<root>/schema_migrations/<id>.json` files and treat migration SQL as a deliberate no-op, so file-mode and SQL-mode deployments of the same application stay in step. `is_applied` is deliberately not spelled `applied?`: on the current trunk a module-level `?`-named function returning a Result record mislowers in the LLVM subset (the call site coerces the record to an integer), so `?` names are reserved for plain-boolean returns.

## Record store (`store.hey`)

`HeyRecordStore` is a JSON record/document store keyed by collection + id, generalized from RecallCoach's production `RecallStorage` module. Two backends behind one API: JSON files per collection (atomic writes, layout-compatible with RecallCoach's file mode) and one SQL table (`collection_name`, `record_id`, `payload`, timestamps, composite primary key) with a parameterized dialect-aware upsert and point fetch.

The adapter seam is the existing `hey_record_connection` contract -- a plain record carrying `dialect` plus callables -- INJECTED by the caller. The store never dials and this package never imports a driver: `Mysql.connect(options)` and `Sqlite3.connect(database, options)` differ in how they dial (a known asymmetry, tracked as an adapter question), but both return the same connection record shape, which is all the store sees. Delete removes one record and reports an absent record as the typed error `not_found` (file backend: existence check before removal; SQL backend: the adapter's affected-rows count, with the honest limit that an adapter reporting no `changes` field cannot detect absence and returns ok). RecallCoach, the source application, deliberately never calls delete -- its pattern is expiry-at-read -- so delete exists for consumers whose domain genuinely removes records. No nil crosses the API: every operation returns a Result record with a typed error code.

## Compiled-lane receipt

`bin/package-check` runs `tools/compiled_receipt.hey` interpreted and as a heyc-built binary against a cleaned store root and requires byte-identical output. Interpreter-green is not compiled-green. The receipt covers the store, the ledger, and everything they import (dialect, SQL plans, datasets); `model.hey` is interpreter-lane only until `HeyRecordModel.find` lowers (the trunk currently mis-resolves its `HeyRecord.first` call as the collections builtin `first`).

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.

# Design: hey_sqlite3

## Ownership

`native.open` returns an extension capability. SQLite open returns a database capability. Prepare returns a statement capability. `Sqlite3.close` closes the database before unloading the extension; every query and execute path finalizes its statement.

## Concurrency

The manifest marks storage and lock-sensitive calls as blocking and non-thread-safe. The loader serializes calls for one extension, but application architecture should still assign each connection to one bounded or partitioned Job lane. Multiple connections provide parallelism.

## Adapter contract

The porcelain connection exposes callable fields consumed by `hey_record`:

- `query(connection, sql)`
- `query_params(connection, sql, parameters)`
- `execute(connection, sql)`
- `execute_params(connection, sql, parameters)`
- `begin`, `commit`, `rollback`, `interrupt`, and `close`

Rows preserve SQLite integers, floats, text, blobs, and nulls. Parameter binding is server/native prepared-statement binding, not string interpolation.

The record also carries `kind: 'hey_record_connection'` and `dialect: 'sqlite3'`, and every execute result reports `changes` (affected rows) and `last_insert_id` -- `changes` is what lets hey_record's store delete report an absent record as the typed error `not_found`. `specs/store_conformance_spec.hey` proves the full store round-trip over a real file database using a hand-copied copy of hey_record 0.3.0's sqlite3-dialect store SQL (hey_record consumes this adapter; locking it here would invert the package layering, so the shim is deliberate and labeled).

`Sqlite3.connect(database, options)` keeps its positional signature; `Sqlite3.connect_options(options)` additionally accepts `{database, ...options}` to mirror `Mysql.connect(options)` for consumers wanting one shape. Whether the adapter surfaces unify on a single signature (breaking sqlite3 callers) is the framework-extraction design's open question Q4.

## Version single source

The only in-source version literal is `hey_sqlite3_version_value()` in `adapter.hey`; `Sqlite3.version()`, `HeySqlite3Info.version()`, and the `.hey/native/hey_sqlite3/<version>/` library search path all derive from it. `bin/package-check` greps the literal against the `VERSION` file and runs `tools/version_receipt.hey` interpreted and compiled, byte-compared against `VERSION`, so in-source version drift (the `0.2.2`-at-`0.2.6` defect) fails the gate.

## What remains package-owned

- contained SQLite amalgamation and provenance;
- backup, incremental blob, and online migration APIs;
- connection pool/Job lane helpers;
- target-specific prebuilt release assets;
- Windows native-loader receipt after Hey promotes it.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.

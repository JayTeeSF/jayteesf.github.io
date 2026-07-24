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

## What remains package-owned

- contained SQLite amalgamation and provenance;
- backup, incremental blob, and online migration APIs;
- connection pool/Job lane helpers;
- target-specific prebuilt release assets;
- Windows native-loader receipt after Hey promotes it.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.

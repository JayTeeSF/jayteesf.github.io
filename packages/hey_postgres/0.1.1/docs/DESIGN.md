# Design

## Layers

- `native/hey_postgres.c` — a thin C shim over libpq exposing stable
  `hey_postgres_*` symbols across the Hey native ABI (`HeyNativeUtf8View`,
  `HeyNativeBytesView`, opaque `HeyNativeHandle`).
- `Native.hey` (`PostgresNative`) — explicit ownership over connections,
  results, and a parameter accumulator; every call returns a `Result`.
- `adapter.hey` (`Postgres`) — porcelain: connect, query/query_one/execute,
  prepared statements, transactions, typed row decoding, health.

## Parameters

libpq's `PQexecParams` takes parallel arrays. Because the native ABI passes
scalars, parameters are accumulated value-by-value into an owned C buffer
(`params_new`/`params_add_text`/`params_add_null`) and executed together. `nil`
becomes SQL NULL; other values are sent in text format and cast server-side.

## Typed rows

Columns are decoded by PostgreSQL type OID: `bool` -> boolean, integer/float/
json OIDs through the JSON reader, `bytea` -> bytes, everything else -> text.
`NULL` is always distinct from an empty string.

## Errors

Failed results surface a typed error carrying SQLSTATE, severity, detail, hint,
and constraint/table/column when libpq provides them.

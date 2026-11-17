# Design

- `native/hey_duckdb.c` — a thin C shim over the DuckDB C API. Query results are
  wrapped in an owned struct that also frees the most recent `duckdb_value_varchar`
  scratch string, so borrowed value views never leak.
- `Native.hey` (`DuckdbNative`) — explicit database/connection/statement/result
  ownership; every call returns a `Result`.
- `adapter.hey` (`DuckDB`) — porcelain: open, query, query_params, query_one,
  close, typed row decoding by `DUCKDB_TYPE`.

Values are read as varchar and coerced by column type (boolean, integer family,
float/double via the JSON reader; everything else stays text). `NULL` is always
distinct from an empty string. Parameters bind positionally and are never
concatenated into SQL.

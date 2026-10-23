# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

The package-specific portion is available directly as `bin/package-check`. It runs the version drift guard (the in-source version literal and `tools/version_receipt.hey` against the `VERSION` file, interpreted and compiled), the API and native specs, `specs/returning_spec.hey` (an `INSERT ... RETURNING` through the execute path must report `ok=true` and carry the returned rows, while ordinary writes keep reporting `changes` and `last_insert_id`), `specs/greatest_least_spec.hey` (PostgreSQL-compatible `greatest()`/`least()` registered on every connection: NULL arguments ignored, NULL only when every argument is NULL, SQLite's own value ordering), `specs/store_conformance_spec.hey` (the hey_record_connection store contract over a real file database), and interpreter/ordinary-product-compiler receipts. The gate fails closed if promoted checks invoke private Stage-0 commands or if the package manifest/runtime imports depend on `hey_durable_log`. The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_sqlite3-0.5.1.zip"
unzip -tq "dist/hey_sqlite3-registry-publication-0.5.1.zip"
cat dist/SHA256SUMS.txt
```

0.4.0 adds `specs/statement_cache_spec.hey` (reuse, unbound reuse, reuse
after a failed step, re-prepare after ALTER TABLE, opt-out, close) with a
negative control: `bin/package-check` rebuilds the library with
`-DHEY_SQLITE3_NEGATIVE_CONTROL_NO_RESET` and requires that spec to fail; and
`specs/checkpoint_spec.hey` on a real WAL file database.
`tools/statement_cache_bench.hey` measures the cache on and off.

0.5.0 adds `specs/json_spec.hey` for `query_json`, `query_rows_json(_with)`
and `query_row_json(_with)`. Every check compares the returned text
byte-for-byte with an expected literal or with the text SQLite's own JSON
functions write for the same data:

- objects, nested objects and arrays, `json(...)` of stored JSON;
- text escapes: quotes, apostrophes, backslash, newline, tab, CR, control
  characters (U+0001, U+001F), DEL, U+2028, accented letters, emoji, CJK, the
  empty string;
- numbers: zero, negatives, NULL, reals (`0.1`, `1.5`, `-2.5e-07`,
  `1.0e+300`, `3.0`), integers above 2^53 (bound and literal) and both int64
  limits; reals computed per row compared against SQLite's own output;
- zero rows for all three calls (`nil`, `[]`, `nil`);
- refusals: more than one column, an integer, a NULL, a bind-count mismatch,
  a syntax error, a missing table, duplicate column names, BLOB values (the
  message names the column), unknown and malformed `json_columns`, a second
  statement and a write (both refused before anything runs; the table is
  checked intact);
- parameter binding: positional, numbered and reused (`?1` twice), named;
- `INSERT ... RETURNING json_object(...)` through `query_json`;
- ORDER BY kept: descending, multi-key with LIMIT (checked against
  `query_params`), with a bound parameter; the first row of `query_row_json`;
- column names that need quoting: spaces, `"`, `'`, CJK, a `[bracket quoted]` name,
  backslash, and expression names (`count(*)`, `max(id) + 1`);
- JSON text columns are strings unless named in `json_columns`;
- trailing semicolons and a trailing `-- comment`;
- the statement cache: 50 repeated calls add no statements, a step error, a
  bind error and a prepare error leave it reusable and do not leak entries,
  and `statement_cache: false` works and caches nothing.

`bin/package-check` also builds the spec with the ordinary product compiler and
requires all 46 checks to print ok.

Negative controls: `bin/package-check` rebuilds the library three times with
a deliberate defect and requires the spec to fail against each:
`-DHEY_SQLITE3_NEGATIVE_CONTROL_JSON_TEXT` (every value turned to text before
`json_object`, 21 checks fail), `..._JSON_QUOTES` (apostrophes in column names
not doubled, the quoting check fails) and `..._JSON_ORDER` (rows re-sorted by
their first column, the order checks fail).

`tools/json_bench.hey` times the four routes to the same feed body and checks
first that they produce the same data (and the SQLite routes the same bytes).
Run it compiled:

```sh
cd "$HEY_ROOT"
./bin/heyc build "$PACKAGE/tools/json_bench.hey" -o /tmp/json_bench
HEY_SQLITE3_LIBRARY="$PACKAGE/.native-build/darwin-arm64/libhey_sqlite3.dylib" /tmp/json_bench
```

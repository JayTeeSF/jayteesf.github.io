# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

The package-specific portion is available directly as `bin/package-check`. It runs the version drift guard (the in-source version literal and `tools/version_receipt.hey` against the `VERSION` file, interpreted and compiled), the API and native specs, `specs/returning_spec.hey` (an `INSERT ... RETURNING` through the execute path must report `ok=true` and carry the returned rows, while ordinary writes keep reporting `changes` and `last_insert_id`), `specs/greatest_least_spec.hey` (PostgreSQL-compatible `greatest()`/`least()` registered on every connection: NULL arguments ignored, NULL only when every argument is NULL, SQLite's own value ordering), `specs/store_conformance_spec.hey` (the hey_record_connection store contract over a real file database), and interpreter/ordinary-product-compiler receipts. The gate fails closed if promoted checks invoke private Stage-0 commands or if the package manifest/runtime imports depend on `hey_durable_log`. The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_sqlite3-0.4.0.zip"
unzip -tq "dist/hey_sqlite3-registry-publication-0.4.0.zip"
cat dist/SHA256SUMS.txt
```

0.4.0 adds `specs/statement_cache_spec.hey` (reuse, unbound reuse, reuse
after a failed step, re-prepare after ALTER TABLE, opt-out, close) with a
negative control: `bin/package-check` rebuilds the library with
`-DHEY_SQLITE3_NEGATIVE_CONTROL_NO_RESET` and requires that spec to fail; and
`specs/checkpoint_spec.hey` on a real WAL file database.
`tools/statement_cache_bench.hey` measures the cache on and off.

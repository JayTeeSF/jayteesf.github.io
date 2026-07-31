# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

The package-specific portion is available directly as `bin/package-check`. The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

`bin/package-check` runs, in order:

1. Every spec in `specs/` through the trunk interpreter (`heyc <spec> --test`). SQL-backend store and ledger specs use a STUB connection record implementing the `hey_record_connection` callable contract, so no live database server is required or contacted.
2. The documentation example.
3. A negative dialect probe: `tools/dialect_refusal_probe.hey` must exit nonzero, proving unknown dialect names refuse instead of silently defaulting to sqlite3.
4. The compiled-lane receipt: `tools/compiled_receipt.hey` runs once interpreted and once as a heyc-built binary, each against a freshly cleaned file-backend store root, and both outputs must be byte-identical. Interpreter-green is not compiled-green; the receipt is the arbiter.

File-backend scratch space lives under this package's `build/` (`HEY_RECORD_SPEC_TMP`, `HEY_RECORD_RECEIPT_ROOT`), never inside the Hey checkout the specs run from.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_record-0.2.5.zip"
unzip -tq "dist/hey_record-registry-publication-0.2.5.zip"
cat dist/SHA256SUMS.txt
```

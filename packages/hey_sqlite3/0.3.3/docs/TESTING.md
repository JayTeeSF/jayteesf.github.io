# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

The package-specific portion is available directly as `bin/package-check`. It runs the version drift guard (the in-source version literal and `tools/version_receipt.hey` against the `VERSION` file, interpreted and compiled), the API and native specs, `specs/store_conformance_spec.hey` (the hey_record_connection store contract over a real file database), and the interpreter/native-C receipts. The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_sqlite3-0.2.6.zip"
unzip -tq "dist/hey_sqlite3-registry-publication-0.2.6.zip"
cat dist/SHA256SUMS.txt
```

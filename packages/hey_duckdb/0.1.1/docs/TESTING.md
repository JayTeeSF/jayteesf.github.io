# Testing

`bin/check` runs the canonical `hey_packager` gate, which invokes
`bin/package-check`:

1. `specs/api_spec.hey` — pure API surface (version, capabilities).
2. `bin/build-native` — builds the DuckDB-backed native library.
3. `specs/native_spec.hey` + `tools/native_receipt.hey` run real parameterized,
   typed queries against an in-memory DuckDB database — no server required.

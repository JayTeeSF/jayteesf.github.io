# Testing

`bin/check` runs the canonical `hey_packager` gate, which invokes
`bin/package-check`:

1. `specs/api_spec.hey` — pure API surface (version, capabilities, conninfo
   quoting); no database required.
2. `bin/build-native` — builds the libpq-backed native library.
3. A throwaway PostgreSQL cluster is created with `initdb`/`pg_ctl` (no root),
   and `specs/native_spec.hey` + `tools/native_receipt.hey` run real
   parameterized, typed, transactional queries through libpq.

If no local PostgreSQL server is available, the live spec is skipped and the
pure API spec still runs.

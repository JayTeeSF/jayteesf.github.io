# hey_postgres documentation

`hey_postgres` is a Hey adapter for PostgreSQL backed by `libpq`.

- `docs/GETTING_STARTED.md` — build the native library and run your first query.
- `docs/DESIGN.md` — ownership model, the parameter accumulator, and typed decoding.
- `docs/TESTING.md` — how the package is verified (pure API spec + live libpq spec).
- `docs/ROADMAP.md` — planned surface (pools, COPY, LISTEN/NOTIFY).
- `docs/examples/basic.hey` — a runnable, database-free example.

The public API is `Postgres` (adapter.hey); `PostgresNative` (Native.hey) exposes
explicit low-level ownership for advanced callers.

# hey_sqlite3 0.5.2

Native SQLite adapter for Hey using ABI-v2 FFI, prepared statements, typed rows, and explicit ownership. Since 0.5.0 it also hands back JSON that SQLite builds itself (`Sqlite3.query_json`, `query_rows_json`, `query_row_json`), unparsed and ready to send as a response body.

The root `README.md` contains the public package overview. This documentation directory is copied intact into every registry publication by `hey_packager`.

## Release controls

```sh
bin/check
bin/release
bin/publish --no-commit
bin/source-zip
```

See `GETTING_STARTED.md`, `DESIGN.md`, `TESTING.md`, and `ROADMAP.md` for package-specific guidance.

# Getting started

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
cd "$HOME/dev/hey_duckdb"
bin/build-native            # generates FFI glue and links libduckdb
```

```hey
import './main.hey'

program
  let opened = DuckDB.open({path: ':memory:'})
  let db = opened.value
  let created = DuckDB.query(db, 'CREATE TABLE t (id INTEGER, name VARCHAR)')
  let inserted = DuckDB.query_params(db, 'INSERT INTO t VALUES ($1, $2)', [1, 'Ada'])
  let rows = DuckDB.query(db, 'SELECT * FROM t')
  says len(rows.value)
  let done = DuckDB.close(db)
end
```

Read Parquet directly through SQL, e.g.
`SELECT * FROM read_parquet('events.parquet')`.

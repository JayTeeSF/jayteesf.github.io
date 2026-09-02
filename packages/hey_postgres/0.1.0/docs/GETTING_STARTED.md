# Getting started

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
cd "$HOME/dev/hey_postgres"
bin/build-native            # generates FFI glue and links libpq -> .native-build/<target>/libhey_postgres.so
```

Then open a connection and run a parameterized query:

```hey
import './main.hey'

program
  let opened = Postgres.open({host: '127.0.0.1', port: 5432, dbname: 'app', user: 'app', sslmode: 'require'})
  let conn = opened.value
  let rows = Postgres.query(conn, 'SELECT id, name FROM cards WHERE name = $1', ['Ada'])
  says len(rows.value)
  let done = Postgres.close(conn)
end
```

The adapter resolves the native library from `options.library_path`, then
`HEY_POSTGRES_LIBRARY`, then `.native-build/<target>/`. Parameters are always
sent out-of-band — values are never concatenated into SQL.

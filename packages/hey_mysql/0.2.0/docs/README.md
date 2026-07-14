# hey_mysql 0.2.0

`hey_mysql` is an independently versioned MariaDB/MySQL client package for Hey 0.99.268a or newer. It replaces the 0.1.0 `mysql` CLI subprocess adapter with Connector/C behind Hey's ABI-v2 native-extension boundary.

## Plumbing and porcelain

- `native/hey_mysql.c`, `native/hey_mysql.h`, `hey.native.json`, and `native.hey` are **plumbing**: Connector/C handles, options, TLS, results, escaping, transactions, and ownership.
- `adapter.hey` is **porcelain**: `Mysql.connect`, URL-shaped options, row objects, query/execute callbacks, transactions, and `hey_record` compatibility.
- Hey owns only the generic FFI, loader, Jobs/worker primitives, and package manager. Connector policy, authentication coverage, and database API evolution remain third-party concerns.

## Build

Install MariaDB Connector/C or MySQL client development files, then:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" \
./bin/build-native
```

The script prefers `pkg-config mariadb`, then `pkg-config mysqlclient`.

For an installed immutable package, put build output outside the package cache:

```sh
PACKAGE="$PWD/.hey/packages/hey_mysql/0.2.0"
OUT="$PWD/.hey/native/hey_mysql/0.2.0/darwin-arm64"
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" "$PACKAGE/bin/build-native" --out "$OUT"
export HEY_MYSQL_LIBRARY="$OUT/libhey_mysql.dylib"
```

## Use it

```hey
import 'pkg:hey_mysql@0.2.0/main'

let opened = Mysql.connect({
  host: '127.0.0.1',
  port: 3306,
  username: 'app',
  password: 'secret',
  database: 'app_production',
  connect_timeout_seconds: 5,
  encoding: 'utf8mb4'
})

let database = opened.value
let rows = Mysql.query_params(database,
  'SELECT id, name FROM cards WHERE name = ?',
  ['Ada'])
Mysql.close(database)
```

## Compiler-lane receipt status

The package passes the Hey interpreter and native-C build/run lanes on Linux. The minimal SQLite fixture inside Hey 0.99.268a passes the default LLVM lane, but these richer adapters use callback-bearing immutable connection values and result shapes that the current self-hosted direct-LLVM supported subset does not yet lower. `bin/check` therefore treats LLVM as an explicit probe (`HEY_CHECK_LLVM=1`) rather than claiming parity. This is tracked as generic compiler work and does not move database code into the language runtime.

## Honest limitation

v0.2.0 uses Connector/C escaping to realize generated `?` parameter plans. Placeholder replacement is intended for SQL emitted by `hey_record`; direct SQL containing literal question marks or comments should use `Mysql.query` or wait for the prepared-statement slice. It does **not** claim server-side prepared statements. Binary parameters and statement reuse are deferred to v0.3.0. The capability record reports this explicitly.

A live MySQL server is not required for the package's base gate: the gate proves generation, loading, client metadata, escaping, timeouts, and deterministic expected connection failure. Live-server receipts remain separate.

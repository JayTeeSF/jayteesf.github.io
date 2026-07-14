# hey_sqlite3 0.2.0

`hey_sqlite3` is an independently versioned SQLite package for Hey 0.99.268a or newer. It replaces the 0.1.0 subprocess adapter with a real native extension built over Hey's ABI-v2 FFI.

## Plumbing and porcelain

- `native/hey_sqlite3.c`, `native/hey_sqlite3.h`, `hey.native.json`, and `native.hey` are **plumbing**. They own C signatures, opaque handles, blocking metadata, bindings, stepping, and deterministic cleanup.
- `adapter.hey` is **porcelain**. `Sqlite3.connect`, `query_params`, `execute_params`, transactions, typed rows, and the `hey_record` callback shape live here.
- Hey itself owns only the generic native ABI, loader, package manager, and conformance fixtures. SQLite release policy and API evolution belong to this package.

## Build the native library

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" \
./bin/build-native
```

The default output is `.native-build/<target>/libhey_sqlite3.*`. Applications should build outside the immutable installed package, for example:

```sh
PACKAGE="$PWD/.hey/packages/hey_sqlite3/0.2.0"
OUT="$PWD/.hey/native/hey_sqlite3/0.2.0/darwin-arm64"
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" "$PACKAGE/bin/build-native" --out "$OUT"
export HEY_SQLITE3_LIBRARY="$OUT/libhey_sqlite3.dylib"
```

Linux uses `.so`. Windows awaits Hey's native Windows extension-loader promotion.

## Use it

```hey
import 'pkg:hey_sqlite3@0.2.0/main'

let opened = Sqlite3.connect('app.sqlite3', {})
let database = opened.value

Sqlite3.execute(database,
  'CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')

Sqlite3.execute_params(database,
  'INSERT INTO cards (name) VALUES (?)',
  ['Ada'])

let cards = Sqlite3.query_params(database,
  'SELECT id, name FROM cards WHERE name = ?',
  ['Ada'])

Sqlite3.close(database)
```

Database calls are marked blocking. Own each connection and its statements from one bounded worker or partitioned Job lane.

## Compiler-lane receipt status

The package passes the Hey interpreter and native-C build/run lanes on Linux. The minimal SQLite fixture inside Hey 0.99.268a passes the default LLVM lane, but these richer adapters use callback-bearing immutable connection values and result shapes that the current self-hosted direct-LLVM supported subset does not yet lower. `bin/check` therefore treats LLVM as an explicit probe (`HEY_CHECK_LLVM=1`) rather than claiming parity. This is tracked as generic compiler work and does not move database code into the language runtime.

## Current release boundary

This release links a system SQLite development library discovered through `pkg-config sqlite3` or `-lsqlite3`. A future package release should contain a checksum-pinned amalgamation and license/provenance receipt for reproducible Darwin, Linux, and Windows builds.

# Design: hey_mysql

## Native ownership

The C wrapper hides `MYSQL*`, `MYSQL_RES*`, row pointers, and Connector/C option enums behind opaque Hey handles. Blocking and non-thread-safe calls are declared in `hey.native.json`; applications should serialize each connection and its result handles in one bounded or partitioned Job lane.

A result handle owns `MYSQL_RES*`. Row buffers are borrowed only until the next fetch, so `adapter.hey` copies fields immediately. Results must close before their connection, and the connection must close before unloading the extension.

## TLS portability

Connector/C vendors expose incompatible option families. Enum constants cannot be discovered with `#ifdef`, so `bin/build-native` compile-probes the actual headers and defines exactly one package-private implementation path:

- `HEY_MYSQL_TLS_API_MYSQL` uses `MYSQL_OPT_SSL_MODE`;
- `HEY_MYSQL_TLS_API_MARIADB` uses the legacy enforce/verify options.

The public modes remain stable across both providers: disabled, preferred, required, and verify-server-certificate. Provider differences stay below the package API.

## Parameter policy

This release uses Connector/C escaping for generated parameter plans. It is deliberately marked as non-prepared. A later package release should add `MYSQL_STMT` handles, typed bind buffers, result metadata, cancellation, and statement reuse without changing Hey's native ABI.

## Language boundary

Hey owns the generic manifest, shim generator, loader, typed marshalling, lifecycle enforcement, package verification, and bounded execution primitives. This package owns Connector/C discovery, C sources, TLS/authentication compatibility, SQL/result semantics, native artifact recipes, and server matrices.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.

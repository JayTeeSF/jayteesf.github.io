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

## Configuration and dev provisioning (RecallCoach lineage)

`config_from_env.hey` and the `tools/dev/` provisioning tier are extractions
of RecallCoach's production-proven setup (its `App.mysql_config` and
`bin/{compose,mysql-up,mysql-down,mysql-configure-auth,select-mysql-port,db-create,lib/load-env}`),
with the app-specific names parameterized (`HEY_MYSQL_APP_NAME`,
`HEY_MYSQL_ENV_VAR`, `HEY_MYSQL_SERVICE`, `HEY_MYSQL_PORT_DEFAULT`). The
package's contract, stated in README.md, encodes two operational doctrines
learned live:

1. Shared infrastructure is idempotent by default; destruction is a flag
   (`mysql-dev up` no-ops when MySQL is serving; `--force` is the only
   recreation path; data volumes are never removed by any subcommand).
2. A root-side gate applies only to the server it can actually reach: every
   root-over-container-socket operation is gated on the compose-managed
   probe (published-port match -- the service answers AND owns the resolved
   port) and skips loudly otherwise.

The provisioning tier is shipped as a locked package command
(`"commands": {"mysql-dev": "bin/mysql-dev.hey"}`) resolving the sibling
shell dispatcher `tools/hey-mysql-dev.sh`, following hey_ios_tv's
command-shipping precedent. The compose file itself remains consumer-owned;
a scaffolded template belongs to the scaffolding package, not here.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.

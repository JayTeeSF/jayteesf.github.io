# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

The package-specific portion is available directly as `bin/package-check`. The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

`bin/package-check` additionally covers the configuration and provisioning
surface:

- `specs/config_from_env_spec.hey` under a fully pinned environment (every
  variable the module reads is set explicitly, so ambient `MYSQL_*` values
  cannot change expected output);
- `tools/config_receipt.hey` as a compiled receipt: interpreter, stage0-C,
  and direct-LLVM outputs must match byte-for-byte;
- `specs/env_layering_spec.sh` (precedence, `_test` forcing, overrides),
  `specs/port_selection_spec.sh` (scan, persistence, `--after`, refusal),
  and `specs/compose_probe_spec.sh` (not-managed verdicts, loud skips, the
  provider-independent `mysql-dev up` no-op).

Honest boundary: everything that needs a RUNNING docker daemon -- compose
up/down/clean, the compose-managed MANAGED verdict, live `configure-auth`
(account drop/create, deterministic inventory, TLS login proof), and
`db-create` against a live server -- is NOT exercised by `bin/check`, and the
check output says so. Those paths get their proof from a consumer project
with a daemon (RecallCoach's tier is the reference), the same way the live
SQL receipt is a separate `bin/check-live` gate.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_mysql-0.2.7.zip"
unzip -tq "dist/hey_mysql-registry-publication-0.2.7.zip"
cat dist/SHA256SUMS.txt
```

# Testing

Every change in this package starts with a test that fails for the stated
reason, observed failing before the implementation exists. A regression test that
has never been seen red is decoration: it can just as easily be defending the
defect as catching it. After a fix lands, re-break the implementation
deliberately, watch the test go red, and restore it.

Assert the invariant, not the observation. "The recovered log contains three
records" is an observation. "Recovery publishes only batches with a complete,
checksummed COMMIT frame, and truncates a partial tail to the last committed
boundary" is the invariant, and it is checked at every byte boundary.

## Run the complete package gate

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager" bin/check
```

`bin/check` is `hey_packager`'s shared validation: `hey-package.json`, `VERSION`,
every declared file, the required documentation, the archive-entry pre-flight,
and the executable documentation example. It then runs the package-specific
portion, which is also available directly:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" bin/package-check
```

That gate runs, in order:

1. the version drift guard — the single in-source version literal in
   `adapter.hey` against the `VERSION` file;
2. `make clean check` — the portable-barrier gate, the recovery/concurrency
   gate, and the native adapter gate, compiled `-std=c11 -Wall -Wextra -Werror
   -Wpedantic`;
3. `bin/check-hey` — the generated ABI-v2 dispatcher, `specs/native_spec.hey`,
   and `tools/native_receipt.hey` byte-compared in both the interpreter and the
   stage0-compiled lane.

The C gates truncate a two-batch journal at every byte offset, verify a corrupt
complete frame is never silently skipped, inject short writes and failed syncs,
send real `SIGKILL` at write/sync/receipt boundaries, exercise concurrent append
callers, and prove the broker uses fewer durable batches than records.

The C core alone, without a Hey toolchain:

```sh
make clean check
```

`HDL_ENABLE_TEST_HOOKS` is set from the Makefile's own `HOOK_CPPFLAGS`, not from
`CPPFLAGS`. It was in `CPPFLAGS` and therefore overridable, so any shell
exporting `CPPFLAGS` for an unrelated library dropped the fault-injection hooks
and the gate stopped building.

## Benchmarks

Benchmarks name the hardware and the parameters; no number is recorded that was
not measured. `docs/BENCHMARK-2026-09-04.md` is the format.

```sh
bin/benchmark 8 250 64 250
```

## Release verification

```sh
bin/release
unzip -tq "dist/hey_durable_log-0.2.0.zip"
unzip -tq "dist/hey_durable_log-registry-publication-0.2.0.zip"
cat dist/SHA256SUMS.txt
```

## Never weaken a gate to make it pass

In particular do not weaken `bin/check-hey`'s interpreter or stage0-compiled
receipts. If a gate is wrong, say so and change it deliberately, with the
reasoning recorded — never quietly.

# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" bin/check
```

`bin/check` runs, in order:

1. The spec harness (`tools/check_specs.hey`): every `specs/*_spec.hey`
   on the interpreter lane. Each spec child runs with its working
   directory at `$HEY_ROOT` because stdlib `Ehy.render` spawns `heyc`
   against a generated file and resolves `stdlib/Ehy.hey` relative to
   the current directory (the EHY cwd quirk, tracked upstream).
2. The version drift guard: the package's ONE in-source version literal
   (`config.hey`, `HeyWebConfig.version()`) must equal the `VERSION`
   file, and the count of version-shaped literals across root modules
   must be exactly one. Grepping against `VERSION` means a bump that
   forgets the literal fails forever after.
3. The LIVE COMPILED SERVE RECEIPT: builds `tools/serve_receipt.hey`
   into a real binary with `heyc build`, starts it on scratch port
   46402, makes a real HTTP request, and asserts the HANDLER-PRODUCED
   BODY (`hey_web-serve-receipt-body-v1`) round-trips, plus zero
   `hey error:` lines in the server log. The body -- never the status
   alone -- is the assertion: hey_web 0.1.x served well-formed empty
   200s (later `server_error` 500s) from a compiled binary without ever
   invoking a registered handler, and a status-only gate passed on
   them. The interpreter lane cannot see this defect class, which is
   why the receipt is compiled.
4. `bin/hey-packager check`: manifest/VERSION identity, declared files,
   required documentation, the executable documentation example, and
   `bin/package-check` (which re-runs the specs from `$HEY_ROOT`).

The serve defect the receipt guards against: in a compiled binary,
`Web.service` is JSON-delegated to the stdlib sidecar (trunk
`runtime/heyc.c` `facades[]` list), so route handler callables cannot
survive the round-trip, while `Web.serve` has a dedicated native shim
(`hey_llvm_web_serve_with_handler_value` + the program's own
`hey_program_web_handler`) and actually dispatches. `HeyWebServer.serve`
therefore uses `Web.serve` and nothing else. `HeyWebServer.service` and
the whole middleware serving lane were REMOVED outright in 0.3.0
(maintainer ruling 2026-07-30) -- no interpreter-lane-only retention;
README's removal table names every deleted call and its replacement.

bin/check additionally runs the fast-lane COMPILED RECEIPT
(`tools/compiled_receipt.hey`: interpreter and compiled stdout must be
byte-identical) and the compiled pages round-trip
(`tools/pages_serve_receipt.hey`: served bytes == authored asset bytes).

Live specs and receipts use scratch ports 46401 (interpreter serve
spec), 46402 (compiled serve receipt), 46511 (pages round-trip driver),
and 46512 (compiled pages receipt) -- never fleet ports. Probes are
killed by the PID captured at start, never by name pattern.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_web-$(cat VERSION).zip"
unzip -tq "dist/hey_web-registry-publication-$(cat VERSION).zip"
cat dist/SHA256SUMS.txt
```

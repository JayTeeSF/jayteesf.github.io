# Getting started

## Install

Pin it like any other Hey package - add it to your project's
`hey-package.json` dependencies and registry pin, then:

```sh
./bin/packages --update    # or --locked, once hey.lock.json exists
```

## Use

The package exposes one module, `src/main.hey`:

```hey
import 'pkg:vss_sync/main.hey'
```

From there you get the protocol identity, route construction, revision and
recovery-envelope validation, and causal winner/alternate selection described
in `docs/README.md`.

## What you still have to provide

Everything impure. `vss_sync` will not open a socket, write a file, hold a
key, or decide policy for you - by design (`docs/DESIGN.md`). A consumer
supplies transport, persistence and key storage and calls into this package
for the parts that must be byte-identical across clients.

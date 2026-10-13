# Getting started

## Install

Pin it like any other Hey package - add it to your project's
`hey-package.json` dependencies and registry pin, then:

```sh
bin/update_packages
```

## Use

The package exposes one module, `main.hey` at the package root:

```hey
import 'pkg:vss_sync@0.1.2/main'
```

From there you get the protocol identity, route construction, revision and
recovery-envelope validation, and causal winner/alternate selection described
in `docs/README.md`.

## What you still have to provide

Everything impure. `vss_sync` will not open a socket, write a file, hold a
key, or decide policy for you - by design (`docs/DESIGN.md`). A consumer
supplies transport, persistence and key storage and calls into this package
for the parts that must be byte-identical across clients.

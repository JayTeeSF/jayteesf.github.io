# Design

## Boundary

`vss_sync` is domain protocol porcelain written in ordinary Hey. It is shared by
native clients and blind servers, but remains independent of transport,
persistence, UI, and secret storage.

```text
VSS client/server policy
  -> vss_sync protocol validation and routes
  -> stdlib:sync causal field merge
```

The package must never receive plaintext passwords, passphrases, recovery codes,
or unwrapped vault keys. Revision values and recovery envelopes contain only
authenticated ciphertext (`nonce`, `ciphertext`, and `tag`) plus visible routing
and causal metadata.

## Why this is a package

The VSS envelope names and HTTP route shapes are application-domain contracts.
They are not general enough for Hey's standard library or language core.

The reusable causal merge primitive remains `stdlib:sync`. Generic package
installation, locks, integrity verification, and `pkg:` imports remain Hey
compiler/tooling responsibilities.

## Concurrency

The package is pure and stateless. Applications may call it from actors,
workers, partitioned Jobs, and bounded streams without package-owned mutable
state or threads.

# Design

Parsing and policy are separate. The native parser produces JSON from its validated tree; the module decodes that representation into immutable values. This small configuration-boundary conversion avoids new runtime/compiler dependencies while preserving a useful generic API. It is not a database-row transport path.

`vendor/tomlc17/UPSTREAM.json` pins an exact upstream commit plus file checksums. UTF-8 checking is enabled. A small lexical guard enforces the published specification’s ASCII bare-token boundary and rejects raw NUL; the vendored upstream sources remain unchanged. One-time parser options are initialized with `pthread_once`; parse allocation accounting is per-thread, and every upstream result is freed on success and failure. Encoded output is independently bounded and includes parser-live allocations in its native-memory check. The decoded runtime objects and libc bookkeeping are outside that native allocation budget.

Numeric formatting temporarily uses a thread-local C numeric locale, preserving the caller's locale. The ordinary value view preserves signed 64-bit integers; the tagged tree additionally preserves TOML type identity. Error metadata excludes raw upstream messages because those can contain input values.

Upstream documentation describes conformance; our tests must demonstrate it through the actual compiled package interface. Resource limits are explicit implementation limits rather than a promise to accept arbitrarily large TOML documents.

Primary references: [TOML 1.1 specification](https://toml.io/en/v1.1.0), [tomlc17](https://github.com/cktan/tomlc17), [toml-test protocol](https://github.com/toml-lang/toml-test).

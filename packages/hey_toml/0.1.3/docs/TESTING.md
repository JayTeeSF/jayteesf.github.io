# Testing

`bin/check` runs package validation, version drift checks, native boundary/error/resource cases and an ordinary LLVM-compiled API receipt. `bin/check-conformance` runs the official TOML 1.1 decoder suite through the compiled package.

The conformance runner is **test-only** and is pinned to `toml-test v2.2.0`. If it is not already installed, build it into this repository's ignored directory:

```sh
mkdir -p build/bin build/go-tmp build/go-cache build/go-mod build/go-path
GOBIN="$PWD/build/bin" GOTMPDIR="$PWD/build/go-tmp" GOCACHE="$PWD/build/go-cache" GOMODCACHE="$PWD/build/go-mod" GOPATH="$PWD/build/go-path" go install github.com/toml-lang/toml-test/v2/cmd/toml-test@v2.2.0
bin/check-conformance
```

Go does not ship in the package and is not required by consuming applications. No tests access live accounts, databases or S3. Native tests cover integer extremes, Unicode, duplicate keys, invalid UTF-8, allocation/output refusal, secret-safe errors and repeated parse cleanup.

Package release metadata is processed by compiled Hey through hey_packager >= 0.1.11; Python is not required. Toolchain discovery accepts HEY/HEY_ROOT or PATH, with a relative sibling checkout as the fallback.

# Testing

Run `bin/check`. The native packages compile with warnings as errors, run binary-value tests, and run an ordinary LLVM-compiled Hey receipt. Streaming integration tests require explicitly configured disposable databases and never assume a consumer's schema. A passing local transport receipt does not establish production workload performance.

Package release metadata is processed by compiled Hey through hey_packager >= 0.1.11; Python is not required. Toolchain discovery accepts HEY/HEY_ROOT or PATH, with a relative sibling checkout as the fallback.

# Testing

Run `bin/check`. It builds the extension, then:

- `specs/native_test.c` loads the RoaringFormatSpec reference files written by the Java implementation (`specs/fixtures`), checks their exact contents, re-serializes the same set built the way Java built it and requires byte-identical output, and checks that truncated, padded and corrupted inputs are refused. It also covers bulk add, ranges including `UINT32_MAX`, union, intersection, paging limits, size caps and removal.
- `specs/receipt.hey` is an ordinary LLVM-compiled Hey program over the module surface; all 17 lines must print `true`.

Supported build targets are Darwin arm64 and Linux x86-64. No performance claim is made beyond CRoaring's own; benchmark your workload before relying on sizes.

Verified 2026-10-21: the full gate on Darwin arm64; the native test on Linux x86-64 in a Debian bookworm clang-16 container. The Hey receipt has not been run on Linux.

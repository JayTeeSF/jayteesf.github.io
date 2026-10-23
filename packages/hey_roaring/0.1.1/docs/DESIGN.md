# Design

`hey_roaring` wraps CRoaring rather than reimplementing Roaring in Hey. Roaring's speed comes from word-parallel AND/OR/popcount loops with AVX2, AVX-512 and NEON paths. On 2026-10-21 the production LLVM lane refused native bitwise operators (`(a & b) | ((a ^ b) << 3)` with `Int` parameters failed with "unsupported boxed expression"), and stdlib `Bits` emulates each operation with one recursive step per bit, so a pure-Hey version could not compete. Revisit when the compiler gains bitwise operators and popcount.

The CRoaring amalgamation is vendored unmodified in `vendor/croaring` at release v5.2.3 (`roaring.c` sha256 `52a918b465406816be99e2d0c777ac0e6473bdb7f997c1e3ab2fc909e1767b55`, `roaring.h` sha256 `3ca742902ee4f2445a3c7f3c7b2424f214f56e1990d86ad3cdaa691ce7869223`), under its Apache-2.0/MIT dual license (`vendor/croaring/LICENSE`). It is compiled as published; the package's own boundary in `native/hey_roaring.c` is built with warnings as errors.

The boundary is deliberately small: create/free, add, bulk add from little-endian uint32 bytes, add range, remove, contains, cardinality, union and intersection into new bitmaps, intersection cardinality, run optimization, portable serialization with a size cap, safe deserialization and bounded value pages. Exported symbols use a `hey_roaring_` prefix because CRoaring already exports names such as `roaring_free`.

Deserialization treats input as untrusted: the declared size must equal the input length exactly, CRoaring's bounds-checked parser reads it, and `roaring_bitmap_internal_validate` must accept the result. Anything else is refused, never partially read.

Two compiler workarounds are in use: the bitmap-record helper takes `boxed` parameters, and callers should free bitmaps one by one rather than iterating a list of bitmap records. Both prevented the compiler treating a bitmap record as an integer.

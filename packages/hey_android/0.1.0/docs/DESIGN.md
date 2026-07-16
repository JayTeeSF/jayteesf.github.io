# Design

## Ownership

- **Hey core/runtime:** target triples, ABI MIR, direct LLVM, ELF objects, callback ABI.
- **Hey CLI porcelain:** generic project generation and evidence receipts.
- **hey_mobile:** cross-platform lifecycle, navigation, view, action, accessibility vocabulary.
- **hey_android:** Android mappings, toolchain/bootstrap, Activity/JNI host adapters, Android capabilities.
- **applications:** concrete screens, policy, credentials, store metadata.

Version 0.1.0 intentionally has no hard manifest dependency on `hey_mobile`
because the existing `hey_mobile` repository has not yet been published as an
immutable package release. A later `hey_android` release should add that locked
dependency after `hey_mobile` is published.

## Pinned test matrix

- Android Gradle Plugin 8.5.2
- Gradle 8.7
- JDK 17
- compile/target API 34
- Build Tools 34.0.0
- NDK 26.1.10909125
- CMake 3.22.1

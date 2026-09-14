# Hey extraction ledger

- **Keep in Hey:**
  - target triples, ABI MIR, direct LLVM/ELF, callback registration and
    generic receipts;
  - the runtime.
  - `hey_android` compiles the runtime from HEY_ROOT unmodified. What it has
    to add today (the Android crypto profile, `--wrap=exit`,
    `--wrap=pthread_create`, build isolation) is listed as toolchain requests
    in `docs/ROADMAP.md`, and moves into Hey when Hey provides it.
- **Keep in `hey_mobile`:** the cross-platform lifecycle, view and action
  vocabulary.
- **Keep here:**
  - Android SDK, NDK, emulator and device orchestration;
  - the NativeActivity entry point;
  - the Android runtime profile;
  - Android host mappings;
  - the JNI shims (`native/ui`) and their `stdlib:Native` manifest; more
    bindings later.
- **Ask of Hey, found by the shims:** a per-call error boundary, and the
  LLVM-lane miscompiles in `docs/ROADMAP.md` request 6. The shims use
  `stdlib:Native` and `hey native` as they are, with no change.
- **Keep in applications:** screens, schemas, auth, storage formats and Play
  metadata.
- **Add no Android syntax to the language core.**
- **Stdlib promotion:** consider it only after two unrelated applications use
  a stable, portable abstraction.
- **Security capabilities:** platform security capabilities stay opaque and
  owned by the package until iOS and Android parity is proven.

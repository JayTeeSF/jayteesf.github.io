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

- **0.4.5:** `choose`, `share_result` and `header.image_open_url` remain
  `hey_mobile` vocabulary. Java handles response bindings and choice mapping;
  the Android Activity owns dialogs, accessibility, ACTION_SEND and ACTION_VIEW.
  Recipient policy, link creation and notes remain in application routes.

- **0.4.8:** Android's private content provider, bitmap encoding, chooser Intent and URI grants remain native platform code. Response bindings remain in the renderer; applications own message content and canonical links. No language/runtime changes or new third-party dependencies.

- Android selects the existing HEY_NO_FAST_TLS runtime compile option because NativeActivity dlopens its shared library; no copied or modified core runtime is introduced.

- **0.4.9:** exact-origin credentials, MediaDataSource range transport and media/account lifecycle are Android bindings. UI definition generation stays in application Hey; shipping SDKs load only their bundle. No compiler, server code, test fixture or downloaded UI is part of the shipped app.

- **0.4.10:** form response retention is renderer protocol; Android owns chooser lifecycle, bounded artwork preparation, private streams and temporary grants. Application Hey chooses the retry label, message and success navigation. Reply creation, authorization and thread links remain application/server behavior.

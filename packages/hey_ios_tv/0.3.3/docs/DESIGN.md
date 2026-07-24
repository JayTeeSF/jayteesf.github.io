# Design

`hey_ios_tv` is Apple TV/tvOS porcelain layered over existing packages and Hey
compiler plumbing.

## Reused rather than rebuilt

- `hey_ios 0.1.3` owns generic Apple capability/build metadata and conventions.
- `hey_tv 0.1.0` owns target-neutral public-display and remote-action values.
- Hey core owns ordinary Hey -> HIR -> MIR -> LLVM, Apple target triples, object
  emission, linking inputs, and the native ABI.
- `hey_packager` owns validation, immutable archives, source handoff, and
  registry publication.

## This package owns

- tvOS SDK discovery and Apple TV application layout.
- UIKit focus and Siri Remote behavior.
- Apple TV simulator/device install and launch receipts.
- Translating `hey_tv` public values into a tvOS public display.
- The scene-contract-v2 renderer (parse the JSON document, draw
  background / text / image / qr / rect and the card-table widget family,
  feed remote presses back as event documents). Card geometry and style
  are renderer-owned so one polished implementation serves every card
  game; apps supply only rank, suit, facing, and arrangement.

It must not add TV syntax, game rules, room policy, credentials, branding, or
persistence to Hey core.

## Real runtime link (0.2.0)

Scene-v2 apps build objects/arrays and encode JSON, so they cannot run on
the v1 no-runtime string shim (which is why v1 app state had to fit in an
i64). From 0.2.0 the build script compiles the real Hey runtime
(`$HEY_ROOT/runtime/hey_runtime.c`) for the Apple TV target and links it
into **every** app; the template's shim is gone and the runtime provides
`hey_runtime_init/shutdown` plus the `hey_llvm_*` string/value ABI. The
runtime object is cached keyed by its source sha256 + target triple.

- **Carve-out dependency.** The runtime is compiled with
  `-DHEY_RUNTIME_NO_PROCESS_SPAWN` — the process-spawn carve-out that lets
  `hey_runtime.c` build for the sandboxed tvOS target. hey_ios_tv 0.2.0
  depends on that carve-out existing in Hey core.
- **OpenSSL stubs.** `hey_runtime.c` unconditionally references OpenSSL
  (TLS + crypto) symbols that are not in the public Apple TV SDK. A
  public-display / card app never reaches those paths, so
  `tools/hey_tvos_link_stubs.c` supplies abort-stubs that satisfy the
  linker (and trap if ever actually called).
- **str ABI.** Hey str-returning entries come back as either a raw C
  string or a boxed `HeyValue*` depending on how the emitter typed the
  return; the template disambiguates with the boxed value's kind tag
  (0..13) versus a JSON string's leading byte, then copies into an
  `NSString` (runtime-allocated returns are never freed from ObjC).

## Build and dependency baseline

- `hey_packager 0.1.3` is local build/release tooling, not a runtime package dependency.
- `hey_tv 0.1.0`
- `hey_ios 0.1.3`
- Hey core runtime (`runtime/hey_runtime.c`) with the
  `HEY_RUNTIME_NO_PROCESS_SPAWN` carve-out, compiled for the tvOS triple.

Dependencies are resolved from the immutable registry and project lock, never from sibling source checkouts.

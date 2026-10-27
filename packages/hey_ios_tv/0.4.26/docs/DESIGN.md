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
- **The Hey checkout is named, not guessed (0.4.17).** `tools/hey-ios-tv-app.sh`
  compiles `$HEY_ROOT/runtime/hey_runtime.c` straight into the shipped app, so
  the checkout it picks IS the product. It used to default to
  `$HOME/dev/hey-lang-bootstrap-plan`, and the device environment layered
  `$HOME/dev/claude_01` on top -- a checkout months out of date. A developer
  testing "current Hey" on real hardware could be shipping an unrelated
  runtime with nothing saying so. There is now no default: pass `--hey-root`
  (or set `HEY_ROOT`), the tool VERIFIES the directory is a Hey checkout, and
  it PRINTS `hey_root`, `hey_root_source`, `hey_head`, `compiler_identity`,
  `runtime_source_sha256` and `hey_ios_tv_version` before compiling anything.
  Gate: `specs/hey_root_provenance_spec.sh`.
- **No OpenSSL, and no fakes for it (0.4.16).** `hey_runtime.c` used to
  reference OpenSSL (TLS + crypto) unconditionally, against headers found
  by accident on the *host* at `/opt/homebrew/include/openssl` for a
  library with no tvOS build at all; 50 hand-written `abort()` stubs made
  that link. A shippable binary containing a TLS client wired to fake
  crypto is not an acceptable target boundary, whatever branch the app
  takes. Hey core now resolves each capability separately for this target:
  TLS client, AES-256-GCM and scrypt are compiled OUT and report
  themselves unavailable, while SHA-256, secure random and constant-time
  compare use the REAL Apple primitives (CommonCrypto, `timingsafe_bcmp`).
  Required stubs: zero. The stub file is deleted, and
  `tools/hey-ios-tv-app.sh` fails the build if an OpenSSL dependency ever
  returns.
- **str ABI.** Hey str-returning entries come back as either a raw C
  string or a boxed `HeyValue*` depending on how the emitter typed the
  return; the template disambiguates with the boxed value's kind tag
  (0..13) versus a JSON string's leading byte, then copies into an
  `NSString` (runtime-allocated returns are never freed from ObjC).

## Build and dependency baseline

- `hey_packager` is declared in `dependencies` as `">=0.1.1 <0.2.0"`, so it appears
  in an application's lock; no module imports it. It provides `bin/check`,
  `bin/bump`, `bin/release` (builds the release, does not publish) and
  `bin/publish` (commits `packages/NAME/VERSION` to
  `~/dev/jayteesf.github.io/packages`; never overwrites, never pushes).
- `hey_tv 0.1.0`
- `hey_ios 0.1.3`
- Hey core runtime (`runtime/hey_runtime.c`) with the
  `HEY_RUNTIME_NO_PROCESS_SPAWN` carve-out, compiled for the tvOS triple.

Dependencies are resolved from the immutable registry and project lock, never from sibling source checkouts.

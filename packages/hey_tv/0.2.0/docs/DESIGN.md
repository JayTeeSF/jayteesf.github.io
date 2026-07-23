# Design

`hey_tv` is the target-neutral television porcelain package.

## Owns

- Public-display descriptions suitable for a shared television.
- Signed join/QR payload descriptions.
- Normalized remote actions such as primary, back, and menu.
- Public/private projection invariants that are independent of Apple or Android.

## Does not own

- Target triples, HIR, MIR, LLVM, object emission, linking, or ABI policy.
- UIKit, tvOS SDK discovery, LEANBACK, Android SDK/NDK, or device launch.
- Web listeners, persistence, Jobs queues, game rules, branding, or prompts.

Those boundaries keep Hey core as plumbing. `hey_ios_tv` and `hey_android_tv`
adapt these values to native TV platforms; `hey_party` consumes them for room
and game public views.

## Build and dependency baseline

- `hey_packager 0.1.3` is local build/release tooling, not a runtime package dependency.
- `hey_tv` has no runtime package dependencies.

Consumer dependencies are resolved from the immutable registry and project lock, never from sibling source checkouts. Executable authoring examples import local package source relatively; installed consumer examples use the immutable `pkg:` form.

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

It must not add TV syntax, game rules, room policy, credentials, branding, or
persistence to Hey core.

## Build and dependency baseline

- `hey_packager 0.1.3` is local build/release tooling, not a runtime package dependency.
- `hey_tv 0.1.0`
- `hey_ios 0.1.3`

Dependencies are resolved from the immutable registry and project lock, never from sibling source checkouts.

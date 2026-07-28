# Design

`hey_android_tv` is Android TV/Google TV porcelain layered over existing
Android support.

## Reused rather than rebuilt

- `hey_android 0.1.4` owns Android lifecycle/UI adapters, pinned toolchain,
  emulator/device setup, and generic Android evidence conventions.
- `hey_tv 0.1.0` owns target-neutral public-display and remote-action values.
- Hey core owns ordinary Hey -> HIR -> MIR -> LLVM, Android target triples, ELF
  emission, JNI/native ABI, and target-neutral project generation plumbing.
- `hey_packager` owns release and publication controls.

## This package owns

- LEANBACK launcher and no-touchscreen declarations.
- D-pad/gamepad focus and primary-action mapping.
- Television landscape layout and banner adaptation.
- TV emulator/device build, install, launch, and evidence orchestration.

It does not duplicate the generic Android toolchain installer, lifecycle model,
or ordinary native application generator.

## Build and dependency baseline

- `hey_packager 0.1.3` is local build/release tooling, not a runtime package dependency.
- `hey_tv 0.1.0`
- `hey_android 0.1.4`

Dependencies are resolved from the immutable registry and project lock, never from sibling source checkouts.

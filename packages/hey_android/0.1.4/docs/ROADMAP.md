# Roadmap

## Done in v0.1.1

- Android toolchain compatibility descriptor.
- Native view and accessibility mappings.
- Lifecycle event mappings.
- macOS SDK/NDK/emulator installer.
- ordinary-Hey debug APK build/install/launch script.
- package tests, immutable packaging, and source handoff.

## Next

1. Publish `hey_mobile` and add it as a locked dependency.
2. Move the generic Activity/view renderer from Hey target fixtures into this package.
3. Add opaque Keystore and BiometricPrompt capabilities.
4. Add WorkManager-backed Jobs and lifecycle-safe background execution.
5. Generate Gradle Wrapper files directly from Hey project porcelain.
6. Add signed AAB and Play validation receipts.
7. Prove the API with VSS Android before considering any stdlib promotion.

## 0.1.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.1.4 — package compatibility

- Align the public `HeyAndroid.version()` receipt with the package manifest.
- Keep `hey_packager` as external release tooling rather than a runtime dependency.
- Require `hey_packager >=0.1.2 <0.2.0` for HEY_ROOT-correct documentation checks.

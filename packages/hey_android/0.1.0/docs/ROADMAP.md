# Roadmap

## Done in v0.1.0

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

# hey_android

`hey_android` is the Android-specific companion to the cross-platform
`hey_mobile` package. It owns Android lifecycle adaptation, native view mapping,
toolchain version policy, emulator/device testing, and future opaque Android
capabilities such as Keystore, BiometricPrompt, WorkManager, and notifications.

It does **not** own target triples, HIR/MIR, LLVM/ELF emission, native callback
ABI, or generic receipts; those remain Hey compiler/runtime plumbing. It also
does not own application screens or product policy.

Version 0.1.0 ships a tested package API and two runnable macOS scripts:

```sh
./tooling/01-install-android-toolchain-macos.sh
./tooling/02-build-and-launch-hey-android.sh
```

The first script installs the pinned API 34 toolchain and creates an emulator.
The second compiles ordinary Hey, builds a debug APK, installs it, launches it,
and captures receipts, Logcat, Activity state, and a screenshot.

Package import after verified installation:

```hey
import 'pkg:hey_android@0.1.0/main'
```

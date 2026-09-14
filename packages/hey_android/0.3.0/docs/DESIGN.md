# Design

## Ownership

- **The Hey toolchain:** the language, heyc, the LLVM lane and the runtime.
  `hey_android` compiles the runtime from the named Hey checkout and never
  edits or copies it.
- **hey_android:**
  - the Android build lane and its pins;
  - the NativeActivity entry point;
  - the runtime profile for Android;
  - the View shims (`native/ui`) and their Hey module;
  - the emulator lane, the receipts, and later the other Android bindings.
- **hey_mobile:** the cross-platform lifecycle, view and action vocabulary.
- **Applications:** screens, policy, credentials and store metadata.

When the toolchain grows an Android target, the build steps move there. The
requests are at the end of `ROADMAP.md`.

## The lane

```
APP.hey
  │  heyc build --emit-llvm-ir              (inside HEY_HEYC_LOCK)
  ▼
app.ll ── verify ir: no target triple, no stdlib archive, one i32 @main(i32, ptr)
  │  rename @main → @hey_program_main; NDK clang --target=aarch64-linux-android35
  ▼
native/ui/hey.native.json
  │  hey native (inside HEY_HEYC_LOCK)  →  hey_android_ui_ffi.c, hey_native_abi.h
  ▼
app.o ─┐
glue.o ├─ clang -shared -z max-page-size=16384 --no-undefined --wrap=exit --wrap=pthread_create
ui.o, ui_ffi.o
runtime objects (cached): hey_runtime.o, hey_compiler_nodes.o,
                          hey_android_platform_crypto.o, sha256.o
  ▼
libhey_app.so ── verify so: aarch64, LOAD align 16384, undefined ⊆ libc/libm/libdl/liblog/libandroid,
  │               no OpenSSL / CommonCrypto / Homebrew
  │  aapt2 link (android-36 android.jar) + zip -0 lib/arm64-v8a + zipalign -P 16 + apksigner
  ▼
app.apk ── verify apk: hasCode=false, no dex, NativeActivity launcher, target 36, lib stored, signature
  │  adb install, am start, wait for the program to end (--ui: for the first commit), logcat
  ▼
receipt.json
```

## Why NativeActivity

`android.app.NativeActivity` is part of the framework.
- A manifest can name it with `hasCode="false"`, and the platform loads the
  library named in `android.app.lib_name`.
- So there is no `classes.dex`, no d8 and no Gradle.
- Phase 2 reaches Java from native code through JNI. The JavaVM and the
  activity object are already in `ANativeActivity`.

## Pins (`tools/android-pins.env`, mirrored in `src/toolchain.hey`)

| pin | value | why |
|---|---|---|
| compile and target SDK | 36 | Play requires target 36 for new apps and updates |
| minimum SDK | 35 | NDK r28 ships libraries up to API 35; a min-35 library runs on 36 |
| build-tools | 36.0.0 | aapt2, zipalign `-P 16`, apksigner v3 |
| NDK | 28.2.13676358 (r28c) | clang 19; 16 KB alignment |
| ABI | arm64-v8a | the emulator on this Mac and current phones |
| page size | 16384 | Play's 16 KB page requirement for native code |
| JDK | 17 | apksigner and avdmanager |
| system image | `system-images;android-36;google_apis_playstore;arm64-v8a` | the Play image, which Android Auto testing will need |
| AVD | `hey_android_API_36`, shown as "hey_android API 36" | AVD names may not contain spaces |

## Build isolation

The Maintainer's shell exports `CPATH=/opt/homebrew/include` and friends. NDK
clang honours them. In the spike it compiled Homebrew's macOS OpenSSL headers
into an "Android" object without an error.

So `tools/android-env.sh`:
- clears every variable a C compiler or linker reads;
- reduces `PATH` to the system directories;
- calls every Android tool by absolute path.

**Checked on every build:**
- The tool records NDK clang's include search path in the receipt, and refuses
  to build if the path includes `/opt/homebrew` or `/usr/local`.
- Each runtime object and the library are scanned for OpenSSL symbol names and
  host paths.

heyc keeps the host `PATH`: it is a host program.

## The Android runtime profile (`native/runtime_profile`)

`hey_runtime.c` needs three primitives on every target: secure random, a
SHA-256 of a file, and constant-time compare. On non-Apple targets it takes all
three from OpenSSL, and the NDK has no OpenSSL. The spike found this was the
only thing stopping the runtime from compiling for Android.

**How the profile gets past it without editing the runtime:**
- It defines `HEY_RUNTIME_NO_TLS_CLIENT`, `_NO_TLS_SERVER`, `_NO_AEAD` and
  `_NO_PASSWORD_KDF`.
- It defines `HEY_RUNTIME_APPLE_CRYPTO`, which is the runtime's platform-crypto
  seam.
- It puts `include/` first on the path, so `<CommonCrypto/CommonDigest.h>` and
  `<CommonCrypto/CommonRandom.h>` resolve to the package.
- The runtime then derives `HEY_RUNTIME_NO_OPENSSL` itself and never includes
  an OpenSSL header.

**Where each primitive comes from:**
- **SHA-256:** Brad Conte's public-domain implementation, vendored unmodified
  in `native/vendor/sha256` with its licence statement.
- **Random:** `getrandom(2)`.
- **Compare:** a branch-free loop.

Every platform name is renamed to `hey_android_*`, so no Apple or OpenSSL
symbol name reaches the library.

**What stays absent on Android:** TLS, AES-256-GCM, scrypt and Argon2id each
return a named error (`crypto_aead_unavailable`, `crypto_kdf_unavailable`).
`examples/platform_capabilities.hey` shows this on the emulator.

## The entry point (`native/glue/hey_android_glue.c`)

This file and `native/ui` are the only non-Hey code in an app. The header
comment explains each of these choices.

**1. The program's own thread.**
- The Hey program runs on its own thread with an explicit 8 MiB stack.
  Default thread stacks are small: my_queue's server crashed on musl's
  128 KiB.
- Threads the runtime creates without attributes get 8 MiB too, through
  `--wrap=pthread_create`.

**2. Output to logcat.**
- stdout and stderr are pipes read by a pump thread.
- Each line becomes one logcat entry: `hey.out` at INFO, `hey.err` at ERROR.
- The glue's own lines go under `hey.app`.

**3. exit() ends the activity.**
- `--wrap=exit` sends the runtime's `exit(70)` here.
- Output is drained into logcat, then the status is logged, then
  `ANativeActivity_finish` runs and the Hey thread ends.

**4. The working directory.** It is the app's files directory, and so are
`HOME` and `TMPDIR`.

**5. One program per process.**
- The runtime has no re-entrant entry point.
- So once the program has ended and its activity is destroyed, in either
  order, the glue logs that and ends the process, and the next launch is
  fresh. A UI program ends after its destroy event, when the activity is
  already gone, so the process exits as soon as the program returns.
- The emulator specs launch the same app twice to prove it.
- Rotation and similar changes are declared in `configChanges`, so they do not
  recreate the activity.
- The manifest's theme is the framework's light theme with no action bar, so
  the program's Views are not covered by one.

## Views from Hey (`native/ui`)

**The shape.** The Hey program owns an event loop. It never returns to the
platform and nothing calls into it, so it needs no library entry point:

```
Hey thread                                      UI thread (ANativeActivity_onCreate's)
──────────                                      ──────────────────────────────────────
next_event ── waits on the event queue ◀─────── push {"kind":"start"}   (attach, in onCreate)
begin, text_row × N  (C memory, no JNI)
commit ── description + 1 byte on the pipe ───▶ ALooper callback: LinearLayout, TextViews,
       ◀── waits for "done" ─────────────────── setContentView, getChildCount
next_event ── waits ◀────────────────────────── input queue: down/up → hit-test → push tap
next_event ◀─────────────────────────────────── onDestroy: push {"kind":"destroy"}
```

**The five shims** (`native/ui/hey.native.json`, symbol prefix `hey_android_ui_`):

| name | arguments | returns | blocking | thread_safe | what it does |
|---|---|---|---|---|---|
| `begin` | none | `i64` 0 | no | no | starts a new description, in C memory |
| `text_row` | `label: utf8`, `id: utf8` | `i64` rows so far, or -1 | no | no | appends a row; an id is 1 to 64 of `[A-Za-z0-9_-]` |
| `commit` | none | `i64` views on screen, or -1 | yes | no | hands the description to the UI thread and waits until it is on screen |
| `next_event` | none | `utf8` JSON | yes | yes | waits for `start`, `tap` (with `id`) or `destroy`; with no activity it answers `destroy` at once |
| `errors` | none | `utf8` | no | yes | the last Java exception or refusal since the previous call, or `''` |

`next_event` is `thread_safe`, so the runtime does not hold the extension's
call lock while it waits, and a UI-side push is never blocked by Hey.

**Why every JNI call is on the UI thread.** Views may only be touched there.
The UI thread's `JNIEnv` is already attached, so no thread attaches to the VM,
and a Hey runtime error cannot happen on the UI thread because Hey never runs
there. The UI thread takes the one lock only for a copy or a queue push; it
never waits on Hey. `commit` waits on the UI thread, and is released with -1
if the activity is destroyed first.

**Drawing on NativeActivity.** `NativeActivity.onCreate` takes the window's
surface and input queue for native code. While the surface is taken, a View
tree set with `setContentView` is laid out but not drawn. Measured on the API 36
emulator: uiautomator lists the Views, and the window stays black. So `attach`
calls `getWindow().takeSurface(null)` and `setFormat(RGBA_8888)` before the
window is added, and the Views draw. The negative control
`HEY_ANDROID_NEGATIVE_CONTROL=surface-taken` skips that call.

**Taps with no dex.** A click listener is a Java interface, and implementing it
needs a class. `java.lang.reflect.Proxy` needs an `InvocationHandler`, which is
an interface too. So this slice keeps NativeActivity's input queue:
- a down and an up within 16 dp is a tap;
- the tap is tested against each row's `getLocationOnScreen`, `getWidth` and
  `getHeight`, read at that moment, so rotation needs nothing special;
- it becomes `{"kind":"tap","id":"row-3"}`.

This loses press state, the platform's touch scrolling (Views get no touches),
IME composition and TalkBack activation. Key events are passed back unhandled,
so the framework still handles back. hey_android uses no Java in any form, so
no dex, generated or loaded from memory, will replace this: input stays on the
native queue. `ROADMAP.md` lists everything that rule costs.

**Loading the extension.** The shims and the generated wrapper are linked into
`libhey_app.so`. NativeActivity has already loaded it, and
`Native.open('libhey_app.so', ...)` returns that same library (measured: by the
soname and by the `dladdr` path, which the glue exports as
`HEY_ANDROID_LIBRARY`). Nothing new appears in `NEEDED`: `jni.h` is headers
only, and `ALooper` and `AInputQueue` are in `libandroid`.

**Styling is fixed in C for now:** a white root, 22 sp black text, 16 dp
padding, amber even rows and blue odd rows. The emulator spec checks drawing by
those colours.

**The Hey side** (`src/android_ui.hey`) wraps the calls and returns plain maps,
not `stdlib:Result` values, because the LLVM lane cannot read a returned
`Result.ok`'s fields. Several other shapes miscompile on that lane (`ROADMAP.md`,
toolchain request 6); `specs/android_ui_host_spec.sh` runs the examples on the
Mac against `specs/support/fake_ui.c` through the same descriptor, which
catches them without a device.

## Runtime object cache

The four runtime objects are built once and stored under
`~/.cache/hey_android/runtime-KEY` (or `$HEY_ANDROID_CACHE`). The key covers:
- the compiler identity (the same computation as hey_ios_tv and Hey core's
  `bin/hey-hermetic-run`);
- the Hey version;
- the SHA-256 of `hey_runtime.c`, the node bundle and the profile files;
- the NDK revision, clang version, target and flags.

A change to any of them builds into a new directory, so a stale object is
never linked.

## Packaging boundary

- **`bin/package-check`** owns hey_android's checks.
- **`hey_packager`** owns manifest verification, required documentation,
  running `docs/examples/basic.hey`, release artifacts, checksums and registry
  publication.

# Roadmap

## Phase 1: a Hey program with the runtime, on Android 16 (0.2.0, done)

**The build:**
- `tools/hey-android-app.sh` turns a Hey program into a signed APK: heyc's
  LLVM IR, NDK r28 clang for `aarch64-linux-android35`, the unmodified Hey
  runtime with the package's Android profile, and one shared library.
- The APK has `hasCode="false"` and runs through `android.app.NativeActivity`.
- It installs and launches on the API 36 emulator.

**What the entry point does** (`native/glue`, the only non-Hey code):
- sends stdout and stderr to logcat;
- turns `exit()` into a finished activity;
- gives the program and the runtime's own threads an 8 MiB stack.

**Around it:**
- `bin/android-doctor` holds the new pins: platform 36, build-tools 36.0.0,
  NDK 28.2.13676358, the Play image, JDK 17.
- `bin/check` runs every step with a negative control, including the emulator.
- The Gradle lane (API 34, AGP 8.5.2, NDK 26.1) was removed.

## Phase 2: JNI bindings callable from Hey

The goal is for Hey code to reach Android's Java APIs through JNI, with no
Java written. The first ones are the View tree, Keystore, HTTP and media.

### What phase 2 needs first, in order

1. **A library entry point in the toolchain.** This is the blocker.
   - Today a Hey build has one `main`.
   - The runtime calls `exit(70)` on any error.
   - A UI calls Hey many times: once per event, per callback, per response.
     So it needs:
     - exported Hey functions (the tvOS lane already calls `hey_fn_*` this way);
     - one `hey_runtime_init`;
     - errors returned to the caller or delivered to a handler, never `exit`;
     - a log sink.
   - Without it, every callback would be a new process.
2. **A way for Hey to call a C function pointer.**
   - JNI is a table of function pointers on `JNIEnv`: `FindClass`,
     `GetMethodID`, `CallObjectMethod` and so on.
   - Either Hey gains foreign-function declarations (address, signature,
     calling convention), or the package ships generated C shims per
     signature. The first is the toolchain's; the second grows the non-Hey
     line count.
3. **The JavaVM and the activity object, handed to Hey.** `ANativeActivity`
   already carries both (`vm`, `clazz`). The glue passes them in.
4. **A UI-thread hand-off.**
   - Views may only be touched on the main thread, and the Hey program runs on
     its own.
   - The glue adds an `ALooper` file-descriptor callback, so Hey can post work
     to the main thread and get a result back.
   - Worker threads that call Java need `AttachCurrentThread` and
     `DetachCurrentThread`. That is a runtime rule the toolchain should own.
5. **Bindings, generated from `android.jar`, not written by hand:**
   - The View tree comes first: `LinearLayout`, `TextView`, `Button`,
     `EditText`, `RecyclerView` (or a list built from `ScrollView`), and
     `setContentView` on the activity.
   - Then Keystore (`java.security.KeyStore`, `javax.crypto.Cipher` with an
     AES key and no user authentication) and HTTP (`HttpURLConnection` over
     the platform's TLS, because the runtime has none on Android).
   - Callbacks from Java into Hey (a click listener, for example) need a Java
     object that implements an interface. `java.lang.reflect.Proxy` with an
     `InvocationHandler` can do this with no dex.
6. **A decision on media.**
   - The platform's `android.media.MediaPlayer` and
     `android.media.session.MediaSession` are in the framework and need no dex.
   - Media3 (ExoPlayer, `MediaLibraryService`) is an AndroidX library. It ships
     as Java bytecode, so the APK would need `classes.dex` and
     `hasCode="true"`. That would be prebuilt library code, not our source.
   - This decision belongs to the Maintainer before phase 2 reaches media.

## Phase 3: My Queue on Android, then Android Auto

**The app itself:**
- A My Queue Android app that draws the served screen description
  (`hey_mobile` api_screens, level 2), written in Hey on the phase 2 bindings.
- The design is `my_queue_2/research/2026-09-13-android-app.md`.

**Android Auto:**
- Android Auto binds to a `MediaBrowserService` (or Media3's
  `MediaLibraryService`) subclass named in the manifest.
- A subclass is a Java class. So the car needs either a generated stub class
  in a dex, or a toolchain feature that emits one.
- It cannot be `hasCode="false"`. Decide this before phase 3's car work.

## Requests for the Hey toolchain

Each item below was measured on HEY_ROOT a406cdd8d (0.99.570a) on 2026-09-13.
`hey_android` works around the first five today, inside the package.

1. **An Android target in heyc.** `heyc build --target aarch64-linux-android35
   --shared` (and x86_64) should do what `tools/hey-android-app.sh` does by
   hand:
   - compile `hey_runtime.c`, the compiler-node bundle and, when the IR asks,
     `libhey_stdlib.a` for the target;
   - clear the host compiler variables;
   - link with `-z max-page-size=16384`;
   - write a receipt.

   Today `heyc_link_llvm_ir_app` is host-only and always adds
   `-lssl -lcrypto`.
2. **An Android profile in `hey_runtime.c`, derived from `__ANDROID__`.**
   - **Today:** `HEY_RUNTIME_NO_OPENSSL` is only derived when
     `HEY_RUNTIME_APPLE_CRYPTO` is set. So `hey_android` defines the Apple
     flag and supplies CommonCrypto-shaped headers
     (`native/runtime_profile`).
   - **Asked:** rename the seam to a platform-neutral name.
   - **Also asked:** hash files with the runtime's own in-tree SHA-256.
     `hey_sha256_init`, `_update` and `_final` already exist and serve
     `Crypto.sha256_text`. With that, no target needs a second SHA-256, and
     only random bytes and compare remain per platform.
   - **Reproduce:** compile `hey_runtime.c` with NDK clang,
     `--target=aarch64-linux-android35`, with `CPATH` unset:
     `fatal error: 'openssl/err.h' file not found`.
3. **A library entry point.** This is phase 2's item 1 above.
   - `hey_runtime_error` (`hey_runtime.c:4718`) ends with `exit(70)`.
   - `hey_android` links with `--wrap=exit` so that exit finishes the
     activity, and then has to end the process.
4. **Explicit stacks for runtime threads.** These threads are created with
   NULL attributes, so they get the platform default:
   - job pool: `hey_runtime.c:21931`
   - I/O reactor: `:14735`
   - actors: `:28165`
   - web monitor and workers: `:7394`, `:7403`
   - scaler: `:26520`
   - retry: `:27420`

   That default is 128 KiB on musl, which crashed my_queue's server, and about
   1 MiB on bionic. `hey_android` links with `--wrap=pthread_create` to give
   them 8 MiB. Please give them explicit stack sizes, as the web connection
   threads have (`:6564`).
5. **Host build isolation.** A cross build should fail when it would search
   `/opt/homebrew` or `/usr/local`. Measured: with `CPATH=/opt/homebrew/include`
   and no profile, NDK clang compiles the runtime with 69 undefined OpenSSL
   symbols and no error (`specs/android_build_spec.sh` keeps this as a
   control).
6. **LLVM-lane gaps.** Each one-liner below fails
   `heyc build --emit-llvm-ir` with "llvm backend supported subset cannot
   lower":
   - `says ['Ada', 'Grace'].join(', ')`: `function call names.join(...)`.
     `Text.join(names, ', ')` does lower.
   - `names.map(fn(n) n + '!')`: expression `fn(n) n`.
   - `set joined = joined == '' ? name : joined + ', ' + name`: the ternary.
   - `Bytes.from_text('diff', 'utf-8')`: function call `Bytes.from_text`.
   - `says Tls.available()`: function call `Tls.available`.
7. **The ordinary build and the IR lane disagree on
   `examples/sha256_vectors.hey`.**
   - `heyc build --emit-llvm-ir` plus `heyc link-ll` builds and passes every
     vector.
   - `heyc build` fails instead. It moves the whole program to the legacy
     consumer because of `Crypto.sha256_file`, and that consumer cannot lower
     `times10(times10(... 'aaaaaaaaaa'))`. The message is
     `expression "aaaaaaaaaa"`, and no binary is written.
9. **Stdlib calls handed to the toolchain at run time.**
   - **How it works:** `hey_llvm_stdlib_json_call` (`hey_runtime.c:17985`)
     answers a call natively when the direct facade table has it
     (`hey_direct_facade_table`, `:17194`, 71 entries). Otherwise it asks a Hey
     toolchain sidecar, found through `HEY_ROOT`.
   - **What goes wrong:** a phone has no toolchain. `Files.write_text` fails
     there at run time with `hey error: stdlib delegation refused:
     Files.write_text (unresolved toolchain path)`, exit 70.
   - **Why it goes unnoticed:** the same binary works on a Mac, but only while
     `HEY_ROOT` is set.
   - **Workaround:** `Files.write_atomic` has a facade and works on the phone.
   - **Reproduce:** a program of `let path = Files.write_text('x.txt', 'y')`,
     run through `heyc build --emit-llvm-ir` and `heyc link-ll`, then
     `env -u HEY_ROOT ./app`.
   - **Asked:** when building for a target without a toolchain, heyc should
     lower the call natively or refuse the build, naming the call. Until then,
     `tools/hey-android-verify.sh ir` refuses such calls by reading the facade
     table.
10. **A misleading Argon2id message.** On a target without OpenSSL,
   `Crypto.derive_key_argon2id` says "requires OpenSSL 3.2 or newer". It
   should say the capability is unavailable for the target, as `derive_key`
   does. The code, `crypto_kdf_unavailable`, is right.

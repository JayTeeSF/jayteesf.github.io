# Testing and evidence

`bin/check` runs three things, in order:
- `hey package verify`;
- `bin/package-check`;
- the documentation example.

`bin/package-check` runs the Hey specs, then five shell specs. Every check that
can pass has a negative control: a deliberately broken input that must fail,
because a check that cannot fail proves nothing.

**The summary line.** The last line counts specs, checks passed, controls
passed and failures. It is printed only when there are no failures.

**Parallel builds.** Set `HEY_HEYC_LOCK` when other heyc builds may run at the
same time. A caller holding the build lock around all of `bin/check` must leave
`HEY_HEYC_LOCK` unset; the lock cannot be taken twice.

## The specs

### `specs/*_spec.hey`

These cover the pins as Hey values, the receipt predicate, and the lifecycle
and UI mappings.

Negative controls:
- the old API 34 / NDK 26.1 matrix is not compatible;
- a negative-control receipt is not a clean run;
- a receipt with a dex is not a clean run.

### `specs/pins_spec.sh`

It checks that:
- `tools/android-pins.env` and `src/toolchain.hey` agree on all ten pins;
- no API 34, build-tools 34, NDK 26.1, Gradle, AGP or CMake pin remains in the
  code.

Negative control: a changed NDK pin is caught.

### `specs/sha256_host_spec.sh`

It checks that:
- the vendored SHA-256, built for the Mac, matches the five NIST vectors in
  `specs/sha256_vectors.txt`;
- `shasum -a 256` agrees with the same file.

Negative control: a wrong digest fails.

### `specs/android_doctor_spec.sh`

It checks that `bin/android-doctor` passes on this Mac's pinned SDK.

Negative controls:
- An SDK holding only the old lane's packages (platform 34, build-tools 34,
  NDK 26.1, the API 34 image) is refused. The refusal must print the
  sdkmanager line for each of the four missing pins.
- With no `HEY_ROOT`, the doctor fails rather than guessing a checkout.

### `specs/android_build_spec.sh`

This spec builds `examples/hello_runtime.hey` with no device.
`CPATH`, `C_INCLUDE_PATH`, `LIBRARY_PATH`, `CPPFLAGS` and `LDFLAGS` all point
at Homebrew during the build.

It checks that:
- **Isolation:** the variables were cleared, and NDK clang searched only NDK
  include directories.
- **The runtime:** it is HEY_ROOT's own, unmodified and not copied.
- **The IR:**
  - it is target-neutral;
  - it has one `i32 @main(i32, ptr)`;
  - every stdlib call it makes has a native facade in the runtime.
- **The library:**
  - it is aarch64, and every LOAD segment is aligned to 16384;
  - every undefined symbol is defined by libc, libm, libdl, liblog or
    libandroid at API 35;
  - `ANativeActivity_onCreate` is exported;
  - it holds no OpenSSL, Apple crypto or Homebrew trace.
- **The APK:**
  - `hasCode="false"` and `extractNativeLibs="false"`, with no dex, jar or
    class files;
  - the launcher is `android.app.NativeActivity`;
  - target 36 and min 35;
  - only `lib/arm64-v8a/libhey_app.so`, stored uncompressed;
  - `zipalign -c -P 16` passes and apksigner verifies.

Negative controls:
- **Stdlib delegation:** a program using `Files.write_text` is refused. The
  runtime hands that call to the Hey toolchain at run time.
- **Target:** IR that names a Mac target triple is refused.
- **Stdlib archive:** IR that needs `libhey_stdlib.a` is refused.
- **Contamination:** the Hey runtime is compiled the way the spike first
  compiled it, with `CPATH` at Homebrew and no profile. That compile succeeds
  quietly. The object check then names the OpenSSL symbols, and so does the
  check of a library linked from that object.
- **Page size:** a library linked with 4 KB pages is refused.
- **Dex:** an APK with a `classes.dex` added and signed again is refused.
- **hasCode:** an APK whose manifest says `hasCode="true"` is refused.

### `specs/android_emulator_spec.sh`

**Mac references.** It first builds a reference for each of the four examples:
the same IR, through heyc's `link-ll`. Each runs with no Hey toolchain in its
environment, as on a phone.

**Boot.** It creates the AVD if needed, then boots `hey_android_API_36`
headless.

**hello_runtime:**
- installs and runs on API 36 arm64-v8a;
- the program returns 0, and the activity is finished and destroyed;
- the process exits, with no crash markers;
- its logcat output equals the Mac run byte for byte, and nothing goes to
  stderr on either side;
- the program thread's stack is 8 MiB, from `pthread_getattr_np`;
- launched a second time, it starts a fresh runtime and prints the same bytes.

**sha256_vectors:**
- all five NIST vectors pass through the Hey runtime on the emulator;
- each vector is checked as text (the runtime's SHA-256) and as a file (the
  vendored SHA-256 through the profile);
- the Mac passes the same vectors.

**platform_capabilities:**
- random bytes and constant-time compare work;
- scrypt, Argon2id and AES-256-GCM return `crypto_kdf_unavailable` and
  `crypto_aead_unavailable`, matching `specs/platform_capabilities.android.txt`.

**runtime_error:**
- the runtime's `exit(70)` ends the program, not the process;
- the activity is finished and destroyed;
- there are no crash markers and no crash dialog;
- stdout and stderr equal the Mac run, which exits 70.

**Shutdown.** The spec shuts the emulator down and checks that no emulator
process for the AVD remains. An EXIT trap does the same on failure or
interrupt.

Negative controls:
- the comparison sees a real difference between platforms: the Mac's
  `derive_key ok` against Android's `crypto_kdf_unavailable`;
- a wrong expected digest fails;
- linked without `--wrap=exit`, the same runtime error kills the process. No
  end is logged, the activity is not finished, and the tool fails.

## Receipts

Every `tools/hey-android-app.sh` run writes `receipt.json` into `--out`. It
records:
- **Toolchain:** the Hey root, head, version and compiler identity; the SHA-256
  of the runtime and node-bundle sources and of the profile; the runtime cache
  key.
- **Build:** the NDK revision and clang version, the target, SDK levels and
  page size; the build isolation (variables cleared, variables that were set,
  the include search path); the library facts; the APK facts, including the
  signer's certificate SHA-256.
- **Run:**
  - the device's API, ABI and kernel page size;
  - whether it installed and launched;
  - how the program ended, and with what status;
  - whether the activity was finished and destroyed, and the process exited;
  - the number of crash markers;
  - the first 20 `hey.*` logcat lines.

A debug APK run on an emulator is not Play evidence. Release signing, an AAB,
Play Console validation and store review are separate gates.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_android-0.2.0.zip"
unzip -tq "dist/hey_android-registry-publication-0.2.0.zip"
cat dist/SHA256SUMS.txt
```

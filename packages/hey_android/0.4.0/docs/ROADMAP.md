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

## Phase 2: Android's Java APIs from Hey, with no Java written

The goal is for Hey code to reach Android's Java APIs through JNI, with no
Java written. The first ones are the View tree, Keystore, HTTP and media.
`docs/PHASE2_FEASIBILITY.md` is the research behind this section, with file
and line evidence.

### Slice 1 (0.3.0, done): rows drawn by a Hey program, and a tap

- **The shape.** The Hey `program` owns the loop. It blocks in
  `Native.call_blocking(ui, 'next_event', [])`, describes the screen as rows,
  and commits it. State is loop-local `set` variables. Nothing calls back into
  Hey, so there is one runtime and one init, and no library entry point.
- **The shims** (`native/ui`, declared in `native/ui/hey.native.json`, wrapped
  by `hey native`): `begin`, `text_row(label, id)`, `commit`, `next_event`
  (`thread_safe`) and `errors`. They are linked into `libhey_app.so`, and the
  program opens that library by its soname.
- **All JNI runs on the UI thread.** `commit` writes to a pipe registered with
  `ALooper_addFd` on the UI thread's looper and waits; the UI thread builds the
  Views and never waits on Hey.
- **Views draw on NativeActivity** once `getWindow().takeSurface(null)` gives
  the surface back. Measured on the API 36 emulator: without it the Views are
  laid out (uiautomator lists them) and the window stays black.
- **Taps without dex:** the input queue stays with NativeActivity, and the
  shims hit-test a tap against the rows' View bounds. This loses press state,
  scrolling, IME and TalkBack activation. Under the no-Java rule then in force,
  input stayed native.
- **Kept from phase 1:** no `classes.dex`, `hasCode="false"`, no Java or Kotlin
  source, 16 KB pages, and a runtime error ends the program and finishes the
  activity. Hey never runs on the UI thread, so a runtime error cannot happen
  there.

### What phase 2 needs, corrected

1. **A library entry point is not a blocker.** The event loop above needs
   none. What a UI still needs from the toolchain is a per-call error
   boundary, so that a bug in one screen does not end the app (request 3
   below).
2. **Calling a C function pointer from Hey is not a blocker.** `stdlib:Native`
   (extension ABI v2) calls C functions by name from a descriptor that
   `hey native` generates, and the LLVM lane lowers those calls natively. The
   JNI function table is used only inside the C shims.
3. **The JavaVM and the activity object** stay in C. The shims capture them in
   `onCreate`; Hey never sees a `jobject` or a `JNIEnv`.
4. **The UI-thread hand-off** is the `ALooper` pipe above. While every JNI call
   stays on the UI thread, no thread is attached to the VM, so no attach rule
   is needed yet. HTTP and Keystore through JNI on a worker thread will need
   `AttachCurrentThread`.
5. **Bindings beyond the slice:** `Button`, `EditText`, a scrolling list, then
   Keystore (`java.security.KeyStore`, `javax.crypto.Cipher`) and HTTP
   (`HttpURLConnection` over the platform's TLS). A shim per operation grows
   the C line count; generating them from `android.jar` is still the aim.
   - **Callbacks from Java need a class.** A click listener, text watcher or
     back callback is a Java interface. `java.lang.reflect.Proxy` does not
     avoid this: it needs an `InvocationHandler`, which is itself an interface.
     The dex-free route is slice 1's native hit-test; the real one is slice 2.

### The rule on Java: withdrawn (2026-09-14)

The Maintainer's rule of 2026-09-13 ("no Java in any form") was withdrawn on
2026-09-14: **Java and Kotlin are allowed, for speed.** Native packages may use
them. Slice 1 above keeps its no-dex shape as the record of what a Hey program
can do through JNI alone, and the Hey-through-JNI bindings stay the long-term
aim. The api_screens renderer (phase 2B below) is Java.

### What a no-Java app would cost on Android (kept for the record)

Measured under the withdrawn rule. With Java allowed, every "lost" item below
is available again through an ordinary Activity, listener or Service; the table
stays because it is still the cost of the Hey-through-JNI route alone.
"Measure" marks an item that was never tried on the emulator.

| area | what works with no Java | what is lost |
|---|---|---|
| drawing | the platform's Views through JNI: text shaping, fonts, emoji, right-to-left, font scale (slice 1) | nothing measured so far |
| taps | native hit-testing of input-queue events against View bounds (slice 1) | `View.OnClickListener`; press and ripple state; long-press and gesture detectors, unless rewritten natively from motion events |
| scrolling | computed natively from motion events and applied with `scrollTo`/`scrollBy` through JNI | the platform's own touch scrolling, fling physics and overscroll: Views get no touches while the input queue is native |
| lists | rows built directly in a `LinearLayout` | `RecyclerView`/`BaseAdapter` (an adapter is a subclass), so no view recycling: memory grows with the row count |
| accessibility | TalkBack can reach the real View tree and read it (uiautomator reads it today; TalkBack itself: measure) | activation: a double-tap calls `performClick`, which has no listener, so nothing reaches the program; custom actions need an `AccessibilityDelegate` subclass |
| text entry, path A | `ANativeActivity_showSoftInput` plus native key events from the input queue | everything an IME does through an `InputConnection`: composition (Chinese, Japanese and Korean input, which needs composing text), autocorrect and suggestions, swipe typing, voice dictation, emoji and clipboard commits, cursor and selection, autofill and password managers. Only characters the keyboard sends as key events arrive |
| text entry, path B (measure) | a platform `EditText` focused through JNI: the IME talks to the `EditText`'s own `InputConnection`, so composition may keep working, and the program reads `getText()` through JNI when an event arrives | `TextWatcher` and `OnEditorActionListener`, so no change or submit callbacks: the program polls, and it gets no touches to place the cursor |
| back | `KEYCODE_BACK` through the native input queue, if it still arrives at target 36 (measure); otherwise the framework default, which moves the task to the back | `OnBackInvokedCallback`, so no predictive-back animation or in-app back handling on the new path |
| audio | `AAudio` (NDK, no JNI), or `MediaPlayer` through JNI, while the activity is in the foreground | background playback (a foreground `Service` is a manifest-declared Java class); audio-focus changes (`OnAudioFocusChangeListener`); completion and error callbacks (polled instead) |
| media controls | none | `MediaSession.Callback` is an abstract class: no lock-screen, notification, headset or Bluetooth transport controls |
| Android Auto | none | not possible: the car binds to a `MediaBrowserService` or Media3 `MediaLibraryService` subclass in `classes.dex` |
| background work | none | services, broadcast receivers, `JobService` and WorkManager all need a Java class: no background sync and no push messages |
| results from other activities | launching an intent through JNI | `onActivityResult` and `onRequestPermissionsResult` are not forwarded to native code: no document or photo picker result; permissions are polled with `checkSelfPermission` on resume (measure) |
| sharing | receiving `ACTION_SEND` through the activity's intent filter and `getIntent()` through JNI; sending with `startActivity` | nothing more known |
| HTTP and Keystore | `HttpURLConnection`, `KeyStore` and `Cipher` through JNI on a worker thread with `AttachCurrentThread` | nothing known: they are plain classes with no callbacks |

### Slice 2 of the JNI route: input with no Java (not scheduled)

With Java allowed, this is no longer on the path to an app. It stays open as
research for Hey-through-JNI: scrolling from native motion events, text entry
through a focused `EditText` against `ANativeActivity_showSoftInput`, whether
`KEYCODE_BACK` reaches the native input queue at target 36, and TalkBack.

## Phase 2B: the api_screens renderer, in Java

A native renderer for the screens a server describes (`hey_mobile`
api_screens), mirroring `hey_ios`'s `HeyIOSApiHost` and `HeyIOSValues`. It names
no product: everything it draws and sends comes from the description.
`my_queue_2/research/2026-09-13-android-app.md` is the design.

**Why Java, not Kotlin.** No Kotlin compiler, Gradle plugin or Maven download
is needed: `javac --release 17` against `android.jar`, then `d8`, `aapt2`,
`zipalign` and `apksigner` from the pinned build-tools 36 build the APK offline,
in the same lane as phase 1. The pure layer is plain Java with no Android class,
so the same sources run the conformance vectors on the Mac's JDK 17 with no test
framework. Compose would need the Kotlin toolchain and AndroidX; that is a
later choice if Views stop being enough.

### Slice 1 (0.4.0, done): level 1, sign-in, a list, a detail screen, sign-out

- **Declared level 1**, platform `android` (`renderer/api-renderer.json`,
  `Values.RENDERER_LEVEL`).
- **The description:** the stored last-good served copy when the renderer takes
  it, else the copy baked into the APK; never waits on the network. It asks
  `served.path?platform=android&level=1` with `If-None-Match` and no
  credentials; a 304 changes nothing; a new copy it takes is stored and drawn
  when nothing is in progress. The refusal rules are hey_mobile's
  (`Descriptions.refusal`); the origin, the secure-store name, `url_scheme`,
  `served` and the session header, prefix, check and sign-out come only from the
  baked copy (`Descriptions.merged`).
- **What it draws:** screen types `list` and `form`; section kinds `fields`,
  `actions`, `rows`, `from` and route sections; action kinds `request`,
  `open_screen` and `open_url`, with `confirm` and `then` (`stay`, `pop`,
  `sign_out`, a screen, reload); form field kinds `text`, `secure`,
  `new_secure`, `url`, `prose`, `multiline`, `code` and `number`, with
  `required`, `same_as`, `missing` (`{label}` and level 1's `%@`) and several
  requests with `skip_empty`; headers, `title_from`, `when`, `where`,
  `hide_when_empty`, `nav_left`/`nav_right`, tabs; system back through
  `OnBackInvokedCallback`; a `ScrollView` per screen.
- **Hidden and never sent:** every kind the level does not know, and every
  level-1 kind this build does not draw yet, is treated the same way: not drawn,
  and `Actions.run` refuses it before any request. A form whose required field is
  not drawn shows no button.
- **Session:** `POST` from the sign-in form, the token sealed with an
  AES-256-GCM key in the Android Keystore, kept in the no-backup directory;
  the session check on launch; a 401 on any other request signs out; sign-out
  revokes and removes the kept file.
- **Values:** `Values.java` passes every vector in hey_mobile 0.3.1's
  `conformance/values.json` (117), `names.json` (81 icon names, 3 file kinds)
  and `descriptions.json` (21), with eleven mutation controls
  (`specs/api_renderer_host_spec.sh`).
- **Proved on the API 36 emulator** against a fake server
  (`specs/api_renderer_emulator_spec.sh`), and once by hand against a local My
  Queue server: sign in, the seeded library, an item, back, sign out.

**Not in slice 1:** icons are mapped (`Names.java`) but not drawn; no images;
no row actions or menus; no pull to refresh, badges or paging; no search or
audio screens; no prompts, choose, rating, share, copy, video, web sign-in,
document or set_var actions; no choice or rating fields; debug signing only.

### Slice 2 (0.4.0, done): prompts, and a release for Google Play

- **Prompts** on a `request` action: asked after its `confirm`, in the order
  hey_ios uses. Each field's trimmed text becomes `$id`; a field's `value`
  prefills it from the row, else the screen's answer. A required field left
  empty shows "<label> is needed." and sends nothing; Cancel sends nothing. A
  prompt with a field of a kind this build does not draw is hidden, like any
  undrawn kind. This is what an account deletion screen needs.
- **The release lane** in `tools/hey-android-api-app.sh`:
  - `--icon PNG`: a square PNG of at least 432 pixels, resized into the five
    mipmap densities. It is compiled from a relative path: aapt2 keeps each
    file's source path in the bundle's `resources.pb`, and an absolute one
    carried the build Mac's home directory into the first bundle built.
  - `--release --keystore KS`: signed with the upload key, not debuggable,
    https only. The password comes from the macOS Keychain
    (`--keychain-service`) or an environment variable
    (`--keystore-password-env`), never an argument, and is written to no log.
  - `--aab`: aapt2 `--proto-format`, a base module, bundletool `build-bundle`
    and `validate` (1.18.3, pinned by sha256 in `tools/android-pins.env` and
    checked by `bin/android-doctor`), jarsigner, and the same certificate,
    version code, target and not-debuggable checks on the bundle.
  - The APK and the bundle are refused if either holds the build directory or
    the home directory.

### What blocks level 2

Declaring a level is a promise that the renderer draws that level's vocabulary.
The server already answers `platform=android&level=2`
(`my_queue_2/bin/check-description`). Before this renderer says 2 it needs:
- **icons drawn** from the neutral names (`icon`, `icons`, `icon_by`): a Material
  Symbols font or vector drawables in the APK, which the lane has no resource
  step for yet (aapt2 compile);
- **the level-1 kinds it hides today**, because level 2 has the same
  vocabulary: search (polling, grouping), audio, prompts, choose, rating (inline
  and sheet), share, copy, video, web sign-in, document (`accept` file kinds to
  MIME types, the route's own method), set_var, choice and rating fields, row
  actions and menus, badges;
- `when` and `=literal` everywhere (the evaluator has them; the host must use
  them at every call site), which the hey_mobile vectors already fix.

### Next slices, in order

1. **Level 2** (the list above), then declare 2 and bake the level-2 answer.
2. **Scrolling and paging:** a `RecyclerView` for long lists, pull to refresh,
   loading more.
3. **Share intent:** an `ACTION_SEND` `text/plain` activity that finds the first
   link, asks for a title and a reason, and sends the description's
   `share.request`.
4. **App Links:** the Play signing key's fingerprint in `assetlinks.json`, and
   intent filters from the description's `web_links`. (Release signing and a
   validated AAB are done: slice 2.)
5. **Account deletion screen:** done in slice 2 (a confirm, then a passphrase
   prompt); walked on the emulator against a local My Queue server.
6. **Media and Android Auto:** Media3 `MediaLibraryService` and ExoPlayer, the
   MediaSession and position reports, then the browse tree the car binds to.
   With Java allowed this is an ordinary Service; `hasCode="false"` no longer
   applies to this app.

## Phase 3: My Queue on Android, then Android Auto

**The app itself:**
- A thin My Queue shell around the phase 2B renderer: its package id, label,
  origin, baked description (the served level answer, byte for byte) and store
  metadata. The renderer stays product-neutral in this package.
- The design is `my_queue_2/research/2026-09-13-android-app.md`.

**Android Auto:**
- Android Auto binds to a `MediaBrowserService` (or Media3's
  `MediaLibraryService`) subclass named in the manifest. With Java allowed that
  is ordinary code in the app's dex (phase 2B, slice 6).

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
2. **Android platform crypto in `hey_runtime.c`: resolved in core.**
   - The runtime now has the neutral `HEY_RUNTIME_PLATFORM_CRYPTO` seam; Android
     no longer defines `HEY_RUNTIME_APPLE_CRYPTO` or ships CommonCrypto-shaped
     headers.
   - SHA-256 and PBKDF2-HMAC-SHA256 are target-neutral in-tree algorithms.
     Android supplies only secure random bytes and constant-time comparison.
   - A real NDK regression compiles `hey_runtime.c` for
     `aarch64-linux-android35` with host include variables removed and requires
     zero OpenSSL/CommonCrypto headers or symbols.
3. **A per-call error boundary.** A UI no longer needs a library entry point
   (phase 2, item 1), but it needs errors that do not end the app.
   - `hey_runtime_error` (`hey_runtime.c:4718`) ends with `exit(70)`.
   - `hey_android` links with `--wrap=exit` so that exit finishes the
     activity, and then has to end the process.
   - The runtime's REPL mode does not help: it is process-wide, and compiled
     code runs on past the error with nil (`docs/PHASE2_FEASIBILITY.md`,
     section 2).
   - **Asked:** errors returned as a Result from an entry the host calls, or a
     thread-local "abandon the current call" that unwinds the compiled code.
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
   - A `stdlib:Result` value returned from a function cannot be read:
     `fn mk() return Result.ok(3) end` then `says 'value ' + mk().value` fails
     with ``string expression `get(r, "value")` ``.
   - A string literal nested as an argument inside another call's arguments:
     `M.draw(ui, rows_for('Tap a row'))` fails with
     ``expression `"Tap a row"` ``.

   **Miscompiled, worse than refused** (measured 2026-09-13 while building
   phase 2's slice 1; the interpreter gets each one right, and `link-ll`
   builds each one with no error):
   - **A string parameter placed in a returned map literal comes back as an
     integer.** `fn wrap(text) return {label: text} end`, then
     `let t = 'hello'`, `let m = wrap(t)`, `says m.label` prints `4302914698`
     instead of `hello`. The same inside an array of maps. Writing `{label: '' + text}`
     avoids it. On Android this reached a native call as
     `native_argument_unsupported`.
   - **Concatenating a parameter into a string changes how it is passed
     earlier in the same function.** In a module function
     `fn begin(ui) let started = Native.call(ui, 'begin', []) says 'ui=' + ui ... end`,
     the call answers `native_call_invalid` (the handle is not passed as an
     integer), while the same call with no concatenation succeeds, and the
     function returned `0` where only `true` or `false` was possible.
   - **A helper that reads a string field from an array parameter returned
     `''`.** `fn label_for(rows, id)`, looping `if rows[i].id == id` and
     `set found = rows[i].label`, found nothing on the LLVM lane. The same loop
     written inline in `program` works. `examples/rows.hey` is written that way.
7. **The ordinary build and the IR lane disagree on
   `examples/sha256_vectors.hey`.**
   - `heyc build --emit-llvm-ir` plus `heyc link-ll` builds and passes every
     vector.
   - `heyc build` fails instead. It moves the whole program to the legacy
     consumer because of `Crypto.sha256_file`, and that consumer cannot lower
     `times10(times10(... 'aaaaaaaaaa'))`. The message is
     `expression "aaaaaaaaaa"`, and no binary is written.
8. **Stdlib calls handed to the toolchain at run time.**
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
9. **A misleading Argon2id message.** On a target without OpenSSL,
   `Crypto.derive_key_argon2id` says "requires OpenSSL 3.2 or newer". It
   should say the capability is unavailable for the target, as `derive_key`
   does. The code, `crypto_kdf_unavailable`, is right.

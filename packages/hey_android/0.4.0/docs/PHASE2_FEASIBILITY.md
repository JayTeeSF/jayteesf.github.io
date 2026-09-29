# Phase 2 feasibility: a Hey renderer driving Android through JNI, inside the package

2026-09-13. Read-only research. Nothing was built, booted, edited or committed.

**Updated the same day, after two things.** Slice 1 was built and measured
(hey_android 0.3.0; `docs/ROADMAP.md`, phase 2). And the Maintainer ruled out
Java in any form: "I don't like the idea of you having to use Java in the same
way I told you not to use objective-c or swift!" So no Java or Kotlin source,
no `classes.dex`, and no generated or in-memory dex. The in-memory listener
class this note proposed for input is withdrawn; the passages below say so
where they mention it. What the rule costs is listed in one place, in
`docs/ROADMAP.md` under "What the no-Java rule costs on Android".
The IR quoted here was emitted earlier on 2026-09-13 by heyc 0.99.570a and is in
the session scratchpad (`mq-tv-0418/src/app.ll`, `hey_android-work/probes/fail.ll`).
Framework types were read with JDK 17 `javap` from
`platforms/android-36/android.jar`. Paths starting `runtime/`, `stdlib/`,
`docs/developers/`, `docs/humans/`, `test/` or `tools/android/` are relative to
`~/dev/hey-lang-bootstrap-plan`.

## The short answer

- **Neither published blocker has to wait for the toolchain.**
  - **No library entry point: avoidable.** The Hey program's `main` never has
    to return. It can be an event loop that blocks in a native call waiting for
    the next event. State lives in loop-local variables. One runtime, one init,
    no exported entry point needed.
  - **No C function pointers from Hey: already solved by the toolchain.** Hey
    has a typed, versioned native-extension ABI (`stdlib:Native`). Hey calls C
    functions by name from a descriptor that `hey native` generates from a
    `hey.native.json`. The LLVM lane lowers it natively. JNI's function table is
    then called only from C shims in `hey_android`.
- **What does not survive is "no dex" for input.** Views render through JNI with
  no Java. But a tap, text entry or the back gesture needs a Java object that
  implements a listener interface.
  - `java.lang.reflect.Proxy` does not avoid that: it needs an
    `InvocationHandler`, which is itself an interface (javap). The idea in
    `ROADMAP.md:63-65` is circular.
  - The dex-free option is native input with hit-testing (no accessibility
    activation, no IME composition). A listener class loaded from dex bytes
    held in memory (`dalvik.system.InMemoryDexClassLoader`) was the other
    option; the Maintainer has ruled it out with all Java.
  - Android Auto's media service needs a real `classes.dex` in the APK, so it
    is not possible under that rule.
- **What remains a toolchain matter is error recovery, not the entry point.**
  - A Hey runtime error still ends the app.
  - The runtime's only non-exiting mode (`hey_runtime_set_repl_mode`) is
    process-wide, and the compiled code runs on past the error.

---

## 1. Can Hey declare and call named C functions?

**Yes.** This is `stdlib:Native`, extension ABI v2.

**The Hey side** (`stdlib/native.hey:3-27`):
```hey
import 'stdlib:Native'

let opened = Native.open(library_path, 'hey_native_<package>_extension_v1')   # Result
let ext = opened.value.handle                                                   # integer capability
let r = Native.call(ext, 'function_name', [arg1, arg2])                         # Result {ok, value | code, message}
let r2 = Native.call_blocking(ext, 'waits_for_something', [])                  # required when the manifest says blocking
Native.close(ext)
```
- **Precedent:** `hey_durable_log/Native.hey:7-60` and `hey_sqlite3/Native.hey:37-80`.
- **The same program in the language's regression:**
  `test/regression_native_ffi_loader.sh:37-63`.

**The C side:**
- **The manifest** (`hey_sqlite3/hey.native.json:1-42`,
  `hey_durable_log/hey.native.json`) lists each function with:
  - `name`, which is what Hey passes;
  - `symbol`, the C function;
  - typed `arguments` and a typed `return`, each with `ownership` and
    `nullable`;
  - `blocking` and `thread_safe`.
- **Generation:** `hey native --manifest hey.native.json --out DIR --target T`
  (`bin/subcmds/hey-native`; used by `hey_durable_log/bin/build-native` and
  `test/regression_native_ffi_loader.sh:10-13`) writes three files:
  - `hey_native_abi.h`;
  - `<pkg>_ffi.c`, holding the `HeyNativeExtensionV1` descriptor and one
    `invoke(function_index, args, argc, result, error)`;
  - a lock file.
- **The package author** writes ordinary C functions and compiles them with the
  generated wrapper into a shared object.

**Loading:**
- `Native.open` does `dlopen(path, RTLD_NOW|RTLD_LOCAL)`, then `dlsym` of the
  descriptor symbol (`runtime/hey_runtime.c:1679-1710`, `:1882-1932`).
- It validates only the ABI version and the value tags (`:1661-1677`). The
  target string is not checked, so an NDK-compiled wrapper loads the same way.

**The LLVM lane, which is the one hey_android uses:**
- `Native.*` lowers natively to `hey_llvm_native_{open,call,call_nonblocking,call_blocking,close}_value`
  (`runtime/hey_runtime.c:22705-22750`). The emitted IR declares them
  (`mq-tv-0418/src/app.ll:314-319`).
- The language's regression refuses a fallback
  (`test/regression_native_ffi_loader.sh:86-91`: `HEY_SELFC_MIR_FALLBACK=error`,
  then it runs the LLVM binary).
- These calls do not go through `hey_llvm_stdlib_json_call`. So
  `tools/hey-android-verify.sh ir` (lines 77-110) will not refuse them, and
  they need no toolchain on the phone.

**Types that cross** (`runtime/hey_native_abi.h:52-77`):

| manifest type | Hey value | C view | notes |
|---|---|---|---|
| `bool` | Bool | `uint8_t` | |
| `i32`, `i64`, `u64` | Int | `int64_t` / `uint64_t` | u64 refuses negatives (`hey_runtime.c:1777-1781`) |
| `f64` | Float (Int accepted) | `double` | `:1787-1798` |
| `utf8` | String | `{const char *data; size_t length}` | argument is a **borrowed view into the Hey string, valid only during the call** (`:1799-1804`); a returned view is **copied** into a new Hey string (`:1840-1847`) after `invoke` returns, so C keeps it alive until then (a per-thread buffer is enough) |
| `bytes` | Bytes | `{const uint8_t *data; size_t length}` | same borrow rules (`:1805-1810`, `:1849-1854`) |
| owned bytes (return only) | Bytes | data + `release(context, data, length)` | runtime copies, then calls `release` (`:1855-1868`) |
| `handle` | Int (a token) | `uintptr_t` | "never expose a native pointer as an ordinary integer" (`docs/developers/native-extensions.md:56`): a package keeps a table and hands out indices |
| `void` / nullable | nil | tag `NIL` | nil passes for any nullable argument (`:1762-1765`) |

**Arrays and maps do not cross.** Encode them as JSON text (`utf8`), or make one
call per element.

**Errors never exit:**
- If the C function returns 0 with a `HeyNativeErrorV1`, Hey gets
  `Result.error` `native_call_failed` with the message (`:2015-2022`).
- A wrong argument type or count also comes back as a Result (`:1985-2007`).

**Concurrency rules:**
- Functions not marked `thread_safe` are serialized per extension under
  `invoke_mutex` (`:2014-2016`).
- A `blocking` function is refused by `Native.call` and needs
  `Native.call_blocking` (`:1976-1981`).
- The runtime checks the flag, not the thread.

**Not supported, and fine for phase 2:**
- callbacks from C into Hey;
- passing Hey closures;
- raw pointers.

The toolchain lists callbacks as "separate design/promotion work"
(`docs/humans/package-c-ffi-roadmap.md:30`, `:45`).

**Conclusion for blocker 2:** JNI goes behind a fixed set of C shim functions,
for example `hey_android_ui_text(parent, id, text)`. Those shims call
`(*env)->NewObject` and `CallVoidMethod` and cache class and method IDs. Hey
calls them by name. Hey never sees a function pointer, a `jobject` or a
`JNIEnv`.

## 2. Repeated calls after one init, and what a runtime error does

### What exists

- **Exported functions.** Every top-level `fn` becomes an external symbol
  `hey_fn_<name>` with `ptr` arguments and result
  (`mq-tv-0418/src/app.ll:972-985`).
- **`main` is a thin wrapper** (`app.ll:1199-1207`): `hey_runtime_set_argv`,
  `hey_runtime_init`, the program body, then `hey_runtime_shutdown`.
- **tvOS already calls exported functions many times after one init:**
  - it declares the functions (`hey_ios_tv/tools/hey_native_tv_runtime.m:24-26`);
  - it calls `hey_runtime_init()` in its own `main` (`:3799`);
  - it calls `hey_fn_tv_scene_init()` once (`:782`);
  - it calls `hey_fn_tv_scene_step(scene_json, event_json)` per event (`:852`).
- **hey_ios** checks that the IR defines `hey_fn_ios_app_manifest` and
  `hey_fn_ios_action_code` (`hey_ios/tools/hey-ios-api-app.sh:149-150`). It
  hands both to the Objective-C host as C function pointers (`:204-208`).

**The cost of the exported-function shape:**
- **The return representation is unstable.** A string comes back either as a
  raw C string or as a boxed `HeyValue*`. tvOS tells them apart by peeking at
  the first word (`hey_native_tv_runtime.m:28-44`).
- **Boxed results leak** (`:41`).
- **Argument types are undocumented.** Strings are passed as raw `char*`.

Nothing in the toolchain documents this ABI. Using it works, but it binds
hey_android to compiler internals.

### What a runtime error does

- **The exit itself.** `hey_runtime_error` prints, counts, then
  `if (!hey_repl_mode) exit(70)` (`runtime/hey_runtime.c:4718-4735`).
  - Every Hey error comes through this one line.
  - `grep -c 'hey_runtime_error('` gives 309 call sites.
  - Other process-ending paths are `abort()` on out-of-memory and on internal
    invariants, and `exit(1)` in the web worker supervisor (`:7094-7195`). A
    renderer does not reach them.
- **REPL mode exists and is exported:**
  - `hey_runtime_set_repl_mode` (`:4674`);
  - `hey_runtime_error_count` (`:4706`);
  - `hey_runtime_clear_error` (`:4702`);
  - `hey_runtime_error_silence_push/pop` (`:4710`).
- **The runtime uses REPL mode as a recovery boundary itself.** Web handlers
  flip it on and compare the error count before and after (`:5279-5281`,
  `:5396-5404`, `:5417-5425`).
- **But compiled code carries on after the error.**
  - `fail.ll:632-634` is `call @hey_runtime_error`, then `call @puts`, then the
    next block. There is no `unreachable` (0 in `app.ll`).
  - So with REPL mode on, the failing function keeps executing with nil in
    place of the failed value. That is not a boundary: side effects after the
    error still happen, and a `while` whose condition was the failed value can
    spin.
  - The flag is also a process-wide atomic, not per thread (`:1211`).
- **Other interception routes do not help:**
  - `atexit` cannot stop the exit.
  - `longjmp` out of `hey_runtime_error` would skip lock releases and reference
    counts, which is unsafe.
  - A per-call worker thread with `--wrap=exit` plus `pthread_exit` kills only
    that thread, but can leave runtime locks held. The glue already says this
    (`native/glue/hey_android_glue.c:32-36`).

### What the phase-1 glue does

- **The entry point.** `tools/hey-android-app.sh:247` renames `@main` to
  `@hey_program_main`. The glue runs it once on an 8 MiB thread
  (`glue.c:210-224`, `:283-293`).
- **The exit wrap** (`glue.c:188-196`):
  - `--wrap=exit` sends any `exit` on a non-UI thread to
    `hey_program_ended` (`:150-186`), which drains logcat and calls
    `ANativeActivity_finish`, then ends that thread.
  - An `exit` on the UI thread still ends the process: `hey_main_thread` is
    the thread that ran `onCreate` (`:258`), and exit on it calls `__real_exit`.
- **After destroy the process ends** (`:228-239`).

### Answer

- **Repeated calls need no library entry point** if Hey owns the loop (section 3).
- **A runtime error is not recoverable today** without a toolchain change.
- **The safe policy for phase 2 is phase 1's:** an error finishes the activity
  with the message in logcat.
- **An optional measured experiment:** turn REPL mode on, have a shim return
  `hey_runtime_error_count()`, and let the Hey loop drop the frame when the
  count moves. It is safe only while the loop body has no side effects before
  its last native call.

## 3. From a tap back into Hey

**Three shapes, best first:**

**A. The event loop in `program`. Recommended; no toolchain ABI.**
- Hey calls `Native.call_blocking(ext, 'next_event', [])`. It blocks on a C
  queue and returns one event as JSON text.
- A tap on the UI thread only pushes to that queue and returns. It never calls
  Hey.
- **The thread** is the existing Hey program thread (8 MiB, `glue.c:283-288`).
- **State** is loop-local: Hey has `while` (`stdlib/Binary.hey:25`) and `set`
  rebinding (`hey_sqlite3/Native.hey:18-22`). The state is rebuilt each
  iteration, and no top-level mutable state is needed.
- **Queue rules:**
  - `next_event` must be `thread_safe: true`. Otherwise it holds the
    extension's `invoke_mutex` while waiting (`hey_runtime.c:2014`), and every
    other call on the extension deadlocks.
  - The UI thread must never wait on Hey. If it did, a render round-trip
    would deadlock.

**B. The host holds the state as text. The tvOS pattern.**
- C calls `hey_fn_step(state_json, event_json)` and keeps the returned string
  (`hey_native_tv_runtime.m:852`).
- It works, but inherits section 2's return-representation guess and leak.
- The call must be made on a Hey-owned thread, not the UI thread: an error
  there would `exit` the process (`glue.c:193`).

**C. State kept in C, keyed by handle.** The `hey_durable_log` precedent.
- A process-wide registry of retained journals, under a mutex, with reference
  counts (`hey_durable_log/src/hey_durable_log_native.c:27-73`, `:194-268`;
  exposed as `DurableLog.open_retained`, `adapter.hey:551`).
- Good for resources that must outlive a frame, such as the view handle table
  and cached `jclass` and `jmethodID` values. Not for app state.

**Callbacks by name from C into Hey** exist only as B, a link-time symbol. The
native ABI has no callback entry (`docs/humans/package-c-ffi-roadmap.md:45`).
The bootstrap plan's old Android lane went the other way: `JNI_OnLoad` plus
`RegisterNatives` on a generated Java Activity
(`tools/android/hey_native_bridge.c:19-30`). That needs a Java class that
declares `native` methods, which means dex.

## 4. A minimal slice, and the thread and dex choices

### Threads, with no Java

- **The UI thread** is the thread that runs `ANativeActivity_onCreate`. On it
  the glue can capture three things:
  - `ALooper_forThread()` (NDK `android/looper.h:61`);
  - `activity->vm`, `activity->env` and `activity->clazz`
    (`android/native_activity.h:64,71,83`);
  - a `NewGlobalRef` of the activity.
- **The UI-thread hand-off:**
  - `ALooper_addFd(ui_looper, pipe_read, ..., ALOOPER_EVENT_INPUT, callback, data)`
    (`looper.h:275`) runs the callback on the UI thread.
  - This replaces `runOnUiThread(Runnable)`, with no Java.
  - A shim called from Hey writes one command to the pipe and waits on a
    condition variable. The callback runs the JNI work with the UI thread's
    `env` and signals back.
- **Every JNI call happens on the UI thread.** Hey's thread never touches JNI,
  so `AttachCurrentThread` is not needed in this slice. HTTP through JNI later
  will need it on a worker.
- **The library** is `libhey_app.so` itself: the generated `<pkg>_ffi.c` and the
  shims link into it. Hey passes its path to `Native.open`. The glue can find
  the path with `dladdr(ANativeActivity_onCreate)` and export it in an
  environment variable, or Hey can pass the bare soname. No new `NEEDED`
  library is required: `jni.h` is headers only, and `ALooper` is in
  `libandroid`, which is already linked (`tools/hey-android-app.sh:319`).

### Two ways to draw, and what each costs

| | Views through JNI | NativeActivity window, drawn by Hey |
|---|---|---|
| text | the platform's: shaping, fonts, emoji, right-to-left, font scale | Hey would need a rasterizer and shaper (FreeType + HarfBuzz vendored), or a JNI `Canvas` on a `Bitmap` |
| input | View input (scroll, press state, IME through `EditText`) needs the window's input queue given back; clicks need a listener object (below) | `AInputQueue` motion events, native, no Java; IME only as key events through `ANativeActivity_showSoftInput` (no composition, autocorrect or CJK) |
| accessibility | built in: `TextView`, `Button` and `contentDescription` work with TalkBack | none; a node provider is a Java subclass |
| dex | none (the listener class once proposed for input is ruled out) | none |
| verdict | the product path | a game path; fails My Queue's accessibility and text needs |

**The NativeActivity catch, unmeasured and step 0 of the slice.**
`NativeActivity.onCreate` calls `getWindow().takeSurface(this)` and
`takeInputQueue(this)` before it loads the library. This is Android framework
source; `Window.takeSurface(SurfaceHolder.Callback2)` and
`takeInputQueue(InputQueue.Callback)` are public (javap, `Window`). While the
surface is taken, a `setContentView` tree is not drawn into the window.
- **The dex-free fix to measure:** from `ANativeActivity_onCreate`, before the
  window is attached, call `getWindow().takeSurface(null)` through JNI. Also
  call `takeInputQueue(null)` once real listeners exist.
- **The fallback:** add the views in a separate window
  (`WindowManager.addView` or `PopupWindow`).

### Input without Java

- **Proxy is not a way out:**
  - `Proxy.newProxyInstance(loader, interfaces, InvocationHandler)` needs a
    handler object.
  - `InvocationHandler` is an interface (javap).
  - No public framework class implements it for native code, and hidden ones
    are blocked at target 36.
- **Option 1, proof only: native hit-testing.**
  - Keep the input queue taken.
  - On `AMOTION_EVENT_ACTION_UP`, find the row under (x, y) using the rectangles
    read through JNI (`getLocationInWindow`, `getHeight`).
  - Zero Java and zero dex.
  - It loses press state, scrolling (the `ScrollView` gets no touches), IME
    and TalkBack activation. TalkBack's double-tap calls `performClick`, and
    with no listener nothing happens.
- **Option 2, ruled out: an in-memory listener class.** This note proposed a
  tiny dex of one class with `native` methods, loaded with
  `InMemoryDexClassLoader` and bound with `RegisterNatives`. The Maintainer
  ruled out Java in any form, generated or in-memory dex included. Input stays
  native (option 1, extended with native scrolling and key events), and
  `docs/ROADMAP.md` lists what that costs.

### The slice

**Goal:** a Hey `program` shows a list of rows. A tap on a row sends
`{kind: tap, id}` to Hey, which returns the next description, and the screen
changes. No Java source, no `classes.dex`, one process, one runtime init.

**`hey_android/native/ui/hey.native.json`** (symbol prefix `hey_android_ui_`):

| name | arguments | return | blocking | thread_safe | C does |
|---|---|---|---|---|---|
| `next_event` | none | `utf8` | true | true | waits on the event queue; returns `{"kind":"start"}` first, then `tap` and `destroy`; the text lives in a per-thread buffer |
| `begin` | none | `handle` | false | false | posts to the UI thread: a new vertical `LinearLayout` inside a `ScrollView` (`NewObject` with the activity as `Context`); keeps a global ref in a handle table |
| `text_row` | `parent: handle`, `id: i64`, `text: utf8` | `handle` | false | false | UI thread: `TextView(Context)`, `setText(NewStringUTF)`, `setTag` or record the id, `addView` |
| `commit` | `root: handle` | `i32` | false | false | UI thread: `Activity.setContentView(root)`; frees the previous tree's global refs |
| `errors` | none | `i64` | false | true | `hey_runtime_error_count()`, for the optional recovery experiment |

**The C files in `hey_android`:**
- `native/ui/hey_android_ui.c`: the handle table, the cached `jclass` and
  `jmethodID` values, the pipe, the `ALooper` callback, the event queue.
- The generated `hey_android_ui_ffi.c`.
- The glue changes:
  - capture the looper, the VM and the activity;
  - add an input-queue callback that hit-tests and enqueues (option 1);
  - `takeSurface(null)`.

**The Hey declarations** (`hey_android/src/ui_native.hey` plus the app):
```hey
import 'stdlib:Native'
import 'stdlib:Json'

module HeyAndroidUiNative
  fn open(library_path)
    return Native.open(library_path, 'hey_native_hey_android_ui_extension_v1')
  end
  fn next_event(ext)
    return Native.call_blocking(ext, 'next_event', [])
  end
  fn begin(ext)
    return Native.call(ext, 'begin', [])
  end
  fn text_row(ext, parent, id, text)
    return Native.call(ext, 'text_row', [parent, id, text])
  end
  fn commit(ext, root)
    return Native.call(ext, 'commit', [root])
  end
end

fn describe(state)            # {kind: 'list', rows: [...]}
  ...
end

fn step(state, event)          # the next state
  ...
end

fn draw(ext, description)      # walks rows: begin, text_row per row, commit
  ...
end

program
  let ext = HeyAndroidUiNative.open(Env.get('HEY_ANDROID_LIBRARY')).value.handle
  let state = {taps: 0}
  let running = true
  while running
    let event = Json.decode(HeyAndroidUiNative.next_event(ext).value)
    if event.kind == 'destroy'
      set running = false
    else
      set state = step(state, event)
      draw(ext, describe(state))
    end
  end
end
```
This is a shape, not checked by heyc. Before the slice counts, `Env.get` and
`Json.decode` must pass `tools/hey-android-verify.sh ir`, which refuses calls
handed to the toolchain. `Json` is a native facade provider
(`compiler/generated/HeyRuntimeCallables.hey:61`).

**Gates, in order, each with a negative control like phase 1's:**
0. The views draw on a NativeActivity after `takeSurface(null)`. Screenshot on
   the emulator.
1. `Native.open` of `libhey_app.so` succeeds on the device. `dlopen` of an
   already loaded library by path or soname.
2. Rows render from a Hey description. The receipt records the view count, read
   back through JNI.
3. A tap, injected with `adb shell input tap`, produces a new Hey description
   and the text changes.
4. A Hey runtime error in `step` finishes the activity with the message in
   logcat, as in phase 1.
5. Rotation and a second launch still work.

**Slice 2, under the no-Java rule:**
- Scrolling computed from native motion events and applied through JNI.
- Text entry: measure a focused `EditText` (its own `InputConnection` may keep
  IME composition) against `ANativeActivity_showSoftInput` and key events.
- Back: target 36 uses predictive back, so whether `KEYCODE_BACK` still
  reaches native code must be measured.
- TalkBack on the View tree, measured.

## 5. Recommendation

**Build phase 2 inside the package now.** The first slice is the one in
section 4: an event loop in `program`, `stdlib:Native` shims, the `ALooper`
hand-off, Views through JNI, and a native hit-test tap. It proves both published
blockers are avoidable with no toolchain change and no Java.

**What to change in `ROADMAP.md`:**
- Phase 2 items 1 and 2 are no longer blockers.
- Item 5's Proxy claim is wrong.
- Item 4's attach rule is not needed while all JNI stays on the UI thread.

**Does "no Java at all" survive?**

| My Queue needs | framework type (javap) | without Java source? |
|---|---|---|
| render lists, text, buttons | `LinearLayout`, `TextView`, `ScrollView`, `Button` | yes, JNI only |
| run on the UI thread | `Runnable` (interface) | avoided: `ALooper_addFd` |
| tap | `View.OnClickListener` (interface) | only as a native hit-test (no accessibility activation) |
| text entry | `TextWatcher`, `TextView.OnEditorActionListener` (interfaces) | only natively: key events, or a focused `EditText` read through JNI (measure); no change callbacks |
| back | `OnBackInvokedCallback` (interface) | only if `KEYCODE_BACK` still reaches native input (measure) |
| lists by adapter | `BaseAdapter` (abstract class) | no; build rows directly (the slice) |
| audio focus, player events | `AudioManager.OnAudioFocusChangeListener`, `MediaPlayer.OnCompletionListener` (interfaces) | no; poll the player; foreground only |
| media session | `MediaSession.Callback` (abstract class; Proxy could not help even with a handler) | no |
| Android Auto | `MediaBrowserService` (abstract `Service`) or Media3 `MediaLibraryService` | **no**: a manifest-declared component is loaded from the APK's `classes.dex` (`hasCode="true"`); Media3 is prebuilt AndroidX dex anyway |
| Keystore, `HttpURLConnection` | plain classes, no callbacks | yes, JNI on a worker thread with `AttachCurrentThread` |

**So, under the Maintainer's rule of no Java in any form:**
- **Rendering and HTTP and Keystore** hold with no Java.
- **Input** is native only: hit-testing, native scrolling and key events.
- **Every callback interface and every manifest component** is out: audio is
  foreground only, and there are no media controls, no background work and no
  Android Auto.
- The full list is in `docs/ROADMAP.md`, "What the no-Java rule costs on
  Android".

**Blockers that really remain, and whose they are:**
1. **Toolchain: a per-call error boundary.** Today a runtime error ends the
   activity (`hey_runtime.c:4734`). REPL mode continues with nil, globally
   (`:1211`; `fail.ll:632-634`). Ask for either:
   - errors returned as a Result from an entry the host calls; or
   - a thread-local "abandon the current call" that unwinds the compiled code.

   This does not block the slice. It blocks shipping an app that survives a bug
   in one screen.
2. **Toolchain: LLVM-lane gaps** (`ROADMAP.md:139-147`): `.join` on arrays,
   `fn` closures in `map`, the ternary, `Bytes.from_text`. A renderer for the
   value language needs them.
3. **Toolchain: stdlib calls without a native facade** fail on the phone
   (`ROADMAP.md:156-173`). Every renderer dependency must pass
   `tools/hey-android-verify.sh ir`.
4. **Toolchain, optional: a documented export ABI.** Only needed for shape B
   (host calls `hey_fn_*`). Shape A does not need it.
5. **Decided by the Maintainer: no Java in any form.** No in-memory dex, and no
   `classes.dex` for Android Auto or Media3, so neither is possible.
6. **Measured in slice 1, gate 0:** Views draw on a NativeActivity after
   `takeSurface(null)`. Without it they are laid out and never drawn.

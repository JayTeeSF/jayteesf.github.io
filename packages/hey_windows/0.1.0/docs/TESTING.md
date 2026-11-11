# Testing

`bin/check` runs `bin/package-check`, which proves, in order:

| step | proves | needs |
|---|---|---|
| `specs/manifest_spec.hey` | the manifest rules: https origin, sizes, folder name, C escaping | Hey |
| header currency | `native/app_manifest.h` is byte for byte what the tool writes | Hey |
| loader identity | `WebView2Loader.dll` is the vendored SDK 1.0.2903.40 file (SHA-256) | sh |
| loader path rule | `host.c` loads the DLL by full path beside the program, never by bare name | sh |
| `bin/build-exe` | `host.c` cross-compiles with mingw-w64 into a PE32+ GUI executable | Docker |
| `bin/wine-smoke` | the window is created with the manifest title and size, the minimum size is set, the receipt is written | Docker, Wine, Xvfb |

`HEY_WINDOWS_SKIP_NATIVE=1 bin/check` runs only the Hey steps on a host
without Docker.

## What Wine cannot prove

Wine has no Microsoft Edge WebView2 runtime, so under Wine the receipt always
says `hey_windows_webview2=absent` with the reason the loader gave. The
browser part (the runtime starts, the controller is created, the origin loads,
the session persists in `%LOCALAPPDATA%\<folder>`) is proven only on a real
PC: run `MyQueue.exe --self-test receipt.txt` there and read
`hey_windows_webview2=present`, then open it normally and sign in twice to see
the session kept.

The release ZIP is `dist/hey_windows-0.1.0.zip`; the executable is not in it
(it is a build output), only what builds it.

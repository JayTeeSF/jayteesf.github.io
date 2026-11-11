# Design

## Three places, three jobs

| where | what | language |
|---|---|---|
| build host | `tools/hey_windows_manifest.hey` validates the manifest and writes `native/app_manifest.h`; `specs/manifest_spec.hey` proves the rules | Hey |
| `tools/winbox` container | mingw-w64 compiles `native/host.c` to a PE32+ executable; Wine runs it on a virtual display for the smoke test | C, sh |
| the PC | the executable creates one window and asks the WebView2 runtime to show the origin inside it | Win32, COM |

The executable contains no Hey. Hey's runtime platform surface for Windows
(threads, UTF-16 paths, files, IOCP, TLS) is unported; the compiler can emit
COFF objects for `x86_64-pc-windows-msvc` and write a bootstrap PE, but there
is no native Windows receipt yet. Pretending otherwise would ship a window that
cannot start. The honest split is the one `hey_ios` already uses: Hey decides
and checks on the build host, a native host draws on the device.

## The host, in order

1. `wWinMain` parses `--self-test PATH`, makes the process DPI aware,
   initialises COM on the UI thread.
2. One window class, one window, centred and clamped to the primary monitor,
   title and sizes from `app_manifest.h`, minimum size enforced in
   `WM_GETMINMAXINFO`.
3. `WebView2Loader.dll` is loaded by its full path beside the executable with
   `LOAD_WITH_ALTERED_SEARCH_PATH`, never by bare name (a DLL found by name in
   the working directory is the classic Windows hijack). Its one entry point,
   `CreateCoreWebView2EnvironmentWithOptions`, is called with the profile folder
   `%LOCALAPPDATA%\<folder>`.
4. Two COM completion handlers, written in C as vtable structs (`CINTERFACE`,
   `COBJMACROS`): the environment handler asks for a controller for the window;
   the controller handler fits the browser to the client area and navigates to
   the origin. `WM_SIZE` refits.
5. Until the browser is up, `WM_PAINT` draws the title and either "Opening
   origin" or the reason the runtime could not start with the Microsoft
   download page. Nothing is hidden behind a blank window.
6. `--self-test PATH` pumps messages for 2.5 s, writes a `key=value` receipt
   (title, window and minimum size, origin, profile folder, `webview2=present`
   or `absent` with the reason), destroys the window and exits 0.

## What is deliberately not here (0.1)

- No native rendering of `hey_mobile` descriptions; the web application is the
  UI. See ROADMAP.md.
- No auto-update, no installer, no code signing. A folder with two files is
  the release; SmartScreen will warn on an unsigned executable the first time.
- No tray icon, no notifications, no deep-link registration (`myqueue://`).
- No custom user agent. The server cannot yet tell the window from a browser;
  that is the first thing to add when the server wants to serve a desktop-first
  screen.

# Getting started

> **EXPERIMENTAL / UNVERIFIED.** hey_iocp has never been loaded or run on
> Windows. It compiles and links into a windows-x64 DLL (cross-built from
> macOS with LLVM, checked for format, exports and imports), and that is all
> that has been proven. Hey 0.99.601a cannot run it anyway: there is no Windows
> Hey compiler distribution, `Native.open` loads libraries with `dlopen` only,
> and `Env.os()` reports `Unknown` on Windows. Do not depend on it for anything
> but following its progress.

1. Cross-build the DLL on macOS or Linux: `brew install llvm lld` (or your
   distribution's clang/lld/llvm packages), then `bin/build-native`.
2. Running it needs, in this order (none exists in Hey 0.99.601a):
   a Hey compiler or runtime that runs on Windows; `Native.open` with
   `LoadLibraryW`/`GetProcAddress`; `Env.os()` returning `Windows`.
3. Then: `HEY_IOCP_LIBRARY=C:\path\hey_iocp.dll`, and `specs/windows_loop_spec.hey`
   is the first thing to run (hey_epoll's loop contract).

Applications should depend on **hey_poller**, not on this package directly.

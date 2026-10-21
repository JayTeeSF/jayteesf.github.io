# hey_iocp documentation

> **EXPERIMENTAL / UNVERIFIED.** hey_iocp has never been loaded or run on
> Windows. It compiles and links into a windows-x64 DLL (cross-built from
> macOS with LLVM, checked for format, exports and imports), and that is all
> that has been proven. Hey 0.99.601a cannot run it anyway: there is no Windows
> Hey compiler distribution, `Native.open` loads libraries with `dlopen` only,
> and `Env.os()` reports `Unknown` on Windows. Do not depend on it for anything
> but following its progress.

- [GETTING_STARTED.md](GETTING_STARTED.md): cross-build the DLL; what it would take to run it.
- [DESIGN.md](DESIGN.md): why I/O completion ports (not WSAPoll), and how readiness is emulated on completions.
- [TESTING.md](TESTING.md): what `bin/check` proves and what remains unverified.
- [ROADMAP.md](ROADMAP.md): the steps to a verified 0.1.0.
- [examples/backend.hey](examples/backend.hey): runs anywhere; [examples/echo.hey](examples/echo.hey): Windows only.

# Roadmap

1. **0.1** (this): one window, WebView2, manifest from Hey, cross-build and
   Wine smoke in a container, receipt on a PC.
2. **Desktop identity**: done in 0.1.1: the application icon, version and
   publisher details, and an application manifest (run as the user, Windows
   10 and 11, per-monitor DPI, UTF-8 code page, long paths). Still to do: a
   user-agent suffix (`HeyWindows/<version>`) so a server can serve a
   desktop-first screen, and a `myqueue://`-style URL scheme registration.
3. **Distribution**: done in 0.2.0 as `bin/hey-windows-app` (per-user NSIS
   installer, Artifact Signing through Jsign, Universal C Runtime builds,
   fingerprinted releases on your own site). Still to do: winget submission,
   automatic updates.
4. **Native Windows Hey** (Maintainer ruling 2026-11-11): Hey itself, native
   and fast, not WSL, is scheduled for the Hey release v607a (Hey project task
   `windows-ordinary-toolchain-target`). This package may then move into the
   toolchain as a `hey windows` app target. Either way, once the runtime runs
   on Windows, render `hey_mobile` descriptions
   with Win32 controls or a WinUI host the way `hey_ios` and `hey_android` do,
   and keep WebView2 only for web content. Until then the web application is
   the UI, and nothing in this package pretends otherwise.

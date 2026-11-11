# Roadmap

1. **0.1** (this): one window, WebView2, manifest from Hey, cross-build and
   Wine smoke in a container, receipt on a PC.
2. **Desktop identity**: a user-agent suffix (`HeyWindows/<version>`) so a
   server can serve a desktop-first screen; an application icon resource; a
   `myqueue://`-style URL scheme registration so links open the window.
3. **Distribution**: a signed executable (Authenticode) and a winget manifest
   or MSIX, so SmartScreen stops warning and updates arrive.
4. **Native rendering**: when the Hey runtime runs on Windows (the Hey project
   task `windows-ordinary-toolchain-target`), render `hey_mobile` descriptions
   with Win32 controls or a WinUI host the way `hey_ios` and `hey_android` do,
   and keep WebView2 only for web content. Until then the web application is
   the UI, and nothing in this package pretends otherwise.

# Getting started

## What you need on the build host

- The Hey compiler checkout (`HEY_ROOT`, default `~/dev/hey-lang-bootstrap-plan`).
- Docker with a Linux engine (Docker Desktop, Colima or Rancher) that can run
  `linux/amd64` containers: the executable is x86-64 and Wine runs only its
  own architecture, so on an Apple-silicon Mac the engine needs Rosetta or
  QEMU emulation turned on (Colima: `--vm-type vz --vz-rosetta`). The package
  must live under your home folder, which is what those share with containers.
  Set `HEY_WINDOWS_DOCKER_CONTEXT` if the engine is not the current context.

The first run builds the `tools/winbox` image (Ubuntu amd64 with mingw-w64,
Wine and a virtual display), once; under emulation that takes about ten
minutes, and the smoke test itself a few seconds.

## Build the default application (My Queue)

```sh
bin/build-exe
# hey_windows_exe=.../dist/MyQueue.exe
# hey_windows_loader=.../dist/WebView2Loader.dll
```

Copy both files into one folder on a Windows PC and double-click
`MyQueue.exe`. If the Microsoft Edge WebView2 runtime is missing (it is part
of Windows 11 and of most Windows 10 machines that have Edge), the window says
so and names the download page; install it and open the program again.

## Build a window for another application

```sh
bin/build-exe --name Example --manifest-flags "--title Example --origin https://example.org --width 1200 --height 800 --min-width 500 --min-height 500 --folder Example"
```

`--icon PNG` sets the program icon (a square PNG; the build makes the Windows
icon sizes from it) and `--publisher TEXT` the publisher shown in the file's
Properties. Use the exact name that will be on your code signing certificate.

The flags are checked by `tools/hey_windows_manifest.hey` (an `https` origin,
sane sizes, a plain folder name) before anything compiles. The data folder
holds the browser profile under `%LOCALAPPDATA%\<folder>`, which is what keeps
the person signed in between launches.

## Prove it without Windows

```sh
bin/wine-smoke
```

runs the executable under Wine with `--self-test`, reads its receipt (title,
window size, minimum size, origin, whether WebView2 was found) and saves a
screenshot of the virtual display. Under Wine the receipt says
`hey_windows_webview2=absent`; on a PC it says `present`.

The release ZIP from `bin/release` is `dist/hey_windows-0.1.2.zip`.

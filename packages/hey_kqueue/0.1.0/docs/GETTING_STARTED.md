# Getting started

Most applications should depend on **hey_poller** instead (one API on every
OS). To use the kqueue loop directly on macOS or a BSD:

1. Depend on the package: `"hey_kqueue": "0.1.0"` in `hey-package.json`, then
   `hey package ensure --project . --update-lock`.
2. Build the native library outside the installed package:

   ```sh
   PACKAGE="$PWD/.hey/packages/hey_kqueue/0.1.0"
   OUT="$PWD/.hey/native/hey_kqueue/0.1.0/darwin-arm64"     # or darwin-x64, freebsd-x64
   HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" "$PACKAGE/bin/build-native" --out "$OUT"
   ```

   `Kqueue.open` finds it there when the program runs from the project root;
   otherwise set `HEY_KQUEUE_LIBRARY` or pass `{library_path: ...}`.
3. Serve: see `examples/echo.hey` and the loop in the package README. Code
   written for hey_epoll's `Epoll` works by renaming `Epoll.` to `Kqueue.`.

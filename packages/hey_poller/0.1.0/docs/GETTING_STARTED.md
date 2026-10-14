# Getting started

1. Add `"hey_poller": "0.1.0"` to `dependencies` in `hey-package.json`, then
   `hey package ensure --project . --update-lock`. This installs hey_epoll,
   hey_kqueue and hey_iocp too (as source).
2. Build the native library for this OS only:

   ```sh
   HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" \
     .hey/packages/hey_poller/0.1.0/bin/build-native --project .
   ```

   It prints `poller_backend=epoll` on Linux and `poller_backend=kqueue` on
   macOS, and writes `.hey/native/<backend package>/<version>/<target>/`.
   In a Docker image, run it in the build stage of the image's own platform.
3. Write the server against `Poller` (see the README and `examples/echo.hey`)
   and run it from the project root.
4. Moving from hey_epoll: replace `import 'pkg:hey_epoll@0.1.1/epoll'` with
   `import 'pkg:hey_poller@0.1.0/poller'` and `Epoll.` with `Poller.`.

# Getting started

1. Add `"hey_poller": "0.2.0"` to `dependencies` in `hey-package.json`, then
   `hey package ensure --project . --update-lock`. This installs hey_epoll,
   hey_kqueue, hey_iocp and hey_io_uring too (as source).
2. Build the native library for this OS only:

   ```sh
   HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" \
     .hey/packages/hey_poller/0.2.0/bin/build-native --project .
   ```

   It prints `poller_backend=epoll` on Linux and `poller_backend=kqueue` on
   macOS, and writes `.hey/native/<backend package>/<version>/<target>/`.
   In a Docker image, run it in the build stage of the image's own platform.
3. Write the server against `Poller` (see the README and `examples/echo.hey`)
   and run it from the project root.
4. Moving from hey_epoll: replace `import 'pkg:hey_epoll@0.1.1/epoll'` with
   `import 'pkg:hey_poller@0.2.0/poller'` and `Epoll.` with `Poller.`.
5. io_uring on Linux, by name: build with `--backend io_uring` (needs
   `liburing-dev`; also builds hey_epoll, the fallback), then
   `Poller.open(host, port, {backend: 'io_uring'})` or
   `HEY_POLLER_BACKEND=io_uring`. In Docker it needs `--security-opt
   seccomp=unconfined` (or a profile allowing io_uring); without it the loop
   serves on epoll and says why on stderr, or fails with `strict: true`.

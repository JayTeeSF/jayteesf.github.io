# Getting started

Most applications should depend on **hey_poller** (0.2.0 or later) and ask
for io_uring by name; it falls back to epoll where io_uring cannot run:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" \
  .hey/packages/hey_poller/0.2.0/bin/build-native --project . --backend io_uring
HEY_POLLER_BACKEND=io_uring ./my-server      # or Poller.open(host, port, {backend: 'io_uring'})
```

To use the loop directly on Linux:

1. Depend on the package: `"hey_io_uring": "0.1.1"` in `hey-package.json`,
   then `hey package ensure --project . --update-lock`.
2. Install liburing's development files (`apk add liburing-dev` on Alpine,
   `apt-get install liburing-dev` on Debian/Ubuntu) and build the library
   outside the installed package:

   ```sh
   PACKAGE="$PWD/.hey/packages/hey_io_uring/0.1.1"
   OUT="$PWD/.hey/native/hey_io_uring/0.1.1/linux-x64"     # or linux-arm64
   HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" "$PACKAGE/bin/build-native" --out "$OUT"
   ```

   In a Docker image, do this in the build stage; the library links liburing
   statically, so the runtime stage needs no extra package.
3. Run it where io_uring is allowed: in Docker, `--security-opt
   seccomp=unconfined` (or a profile allowing the three io_uring system
   calls); Linux 6.0 or later. `IoUring.available({})` says whether it can.
4. Serve: see `examples/echo.hey` and the loop in the package README. Code
   written for hey_epoll's `Epoll` works by renaming `Epoll.` to `IoUring.`,
   as long as it calls `wait()` after sending (a serving loop does).

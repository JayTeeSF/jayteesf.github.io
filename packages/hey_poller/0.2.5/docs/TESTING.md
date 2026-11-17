# Testing

`bin/check` (hey-packager) runs `bin/package-check` from the package root:

1. version drift guard (`poller.hey` against `VERSION`);
2. `bin/build-native` must select this host's backend (`kqueue` on macOS,
   `epoll` on Linux) and build **only** that one under `.hey/native`;
3. `specs/selection_spec.hey`: `backend_for` for Linux, Darwin, the four BSDs
   and Windows; negative controls inside the spec — `Unknown`, `SunOS` and `''`
   select nothing, `open()` refuses with `poller_unsupported_os` and
   `poller_unknown_backend`; and `backend()` on this host equals the rule.
   io_uring: Linux's default is still epoll; `io_uring` is a known backend;
   strict refuses with the io_uring error (off Linux `io_uring_unsupported_os`,
   on Linux with no library `io_uring_native_library_missing`); not strict, it
   falls back to this OS's backend, serves a request, and the loop names the
   reason. Run twice, the second time with `HEY_POLLER_STRICT=1`;
4. `specs/roundtrip_spec.hey`: hey_epoll's loop contract (request/reply,
   partial input, pipelined input re-offered, stale id, close after reply,
   non-text refused) through `Poller` on this host's backend, plus
   `loop.backend == Poller.backend() == stats().backend`;
5. `tools/serve_receipt.hey` through the product compiler (a real HTTP round trip);
6. negative controls on `poller.hey`: with Linux and macOS swapped the
   selection spec must fail; with this host sent to iocp both specs must fail;
   with the io_uring fallback removed, with strict ignored, and with io_uring
   made Linux's default, the selection spec must fail.

`bin/linux-check` copies the package into a Linux container with the Hey
toolchain (`hey-toolchain:<version>-arm64`, else `-amd64`), installs the locked
packages there, and requires: epoll selected and the only library built, both
specs, the HTTP receipt, and 201 HTTP requests answered by the compiled server
(`wget`). Then, with liburing-dev installed and `bin/build-native --backend
io_uring` (both libraries built): `specs/fallback_spec.hey` under Docker's
default seccomp profile (io_uring asked for falls back to epoll and serves,
with `io_uring_blocked` as the reason; strict refuses with it), and in a
second container with `--security-opt seccomp=unconfined`,
`specs/io_uring_spec.hey` (the loop contract through Poller on io_uring,
strict, no fallback). `--bench` adds `bench/compare` inside the container.

`bench/compare` (macOS or Linux, needs wrk) builds `bench/server.hey` through
Poller, the same server against the backend module directly, the server
through Poller forced to hey_epoll (on macOS: hey_epoll's kqueue path) and
stdlib `Web.serve`, and prints req/s, p50/p99, server CPU and requests per
server CPU-second. `--close` sends a new connection per request.

Package release metadata is processed by compiled Hey through hey_packager >= 0.1.11; Python is not required.

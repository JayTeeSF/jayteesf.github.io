# Testing

`bin/check` (hey-packager) runs `bin/package-check` from the package root:

1. version drift guard (`poller.hey` against `VERSION`);
2. `bin/build-native` must select this host's backend (`kqueue` on macOS,
   `epoll` on Linux) and build **only** that one under `.hey/native`;
3. `specs/selection_spec.hey`: `backend_for` for Linux, Darwin, the four BSDs
   and Windows; negative controls inside the spec — `Unknown`, `SunOS` and `''`
   select nothing, `open()` refuses with `poller_unsupported_os` and
   `poller_unknown_backend`; and `backend()` on this host equals the rule;
4. `specs/roundtrip_spec.hey`: hey_epoll's loop contract (request/reply,
   partial input, pipelined input re-offered, stale id, close after reply,
   non-text refused) through `Poller` on this host's backend, plus
   `loop.backend == Poller.backend() == stats().backend`;
5. `tools/serve_receipt.hey` through the product compiler (a real HTTP round trip);
6. negative controls on `poller.hey`: with Linux and macOS swapped the
   selection spec must fail; with this host sent to iocp both specs must fail.

`bin/linux-check` copies the package into a Linux container with the Hey
toolchain (`hey-toolchain:<version>-arm64`, else `-amd64`), installs the locked
packages there, and requires: epoll selected and the only library built, both
specs, the HTTP receipt, and 201 HTTP requests answered by the compiled server
(`wget`). `--bench` adds `bench/compare` inside the container.

`bench/compare` (macOS or Linux, needs wrk) builds `bench/server.hey` through
Poller, the same server against the backend module directly, the server
through Poller forced to hey_epoll (on macOS: hey_epoll's kqueue path) and
stdlib `Web.serve`, and prints req/s, p50/p99, server CPU and requests per
server CPU-second. `--close` sends a new connection per request.

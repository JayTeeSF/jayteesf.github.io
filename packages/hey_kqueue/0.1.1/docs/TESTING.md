# Testing

`bin/check` (hey-packager) runs `bin/package-check`, which:

1. guards the in-source version literal against `VERSION` and keeps `HeyValue`
   out of the package-facing native sources;
2. on a host without kqueue (Linux, Windows) stops there and says SKIP;
3. builds the library and runs, in the interpreter,
   - `specs/loop_spec.hey` — hey_epoll's contract unchanged: one request/reply,
     a partial request held until it completes, pipelined input re-offered after
     a consuming `send`, a stale id, close-after-reply, non-text input refused;
   - `specs/kqueue_spec.hey` — `backend()`, 100 connections accepted in one pass
     (more than the 64-entry changelist, so it must flush early) all served and
     all still registered for a second request, `inherits` true, `live` back to 0;
4. compiles `tools/serve_receipt.hey` with the ordinary product compiler and
   compares its output (a real HTTP round trip);
5. negative controls — rebuilds the library with one defect and requires the
   specs to FAIL against it:
   - *pipelined*: leftovers after a consuming `send` are never re-offered
     (`loop_spec` must fail);
   - *changelist*: the queued registrations never reach the kernel with the
     wait (`loop_spec` and `kqueue_spec` must both fail).

## Benchmark

`bench/macos` compiles one keep-alive HTTP server per backend from
`bench/server.hey.in` (hey_kqueue, hey_epoll's kqueue path from
`HEY_EPOLL_ROOT`, default `~/dev/hey_epoll`) plus `bench/webserve.hey` (stdlib
`Web.serve`, workers 1 and the CPU default), drives each with wrk, and prints
req/s, p50/p99, the server's CPU in cores and requests per server CPU-second.
`--reverse` runs hey_epoll first, to separate order and heat from the result.

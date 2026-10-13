# Testing

`bin/check` (hey-packager) runs `bin/package-check`, which:

1. guards the in-source version literal against `VERSION` and keeps `HeyValue`
   out of the package-facing native sources;
2. builds the library and runs `specs/loop_spec.hey` in the interpreter: one
   request/reply, a partial request held until it completes, pipelined input
   re-offered after a consuming `send`, a stale id, close-after-reply, and
   non-text input refused;
3. compiles `tools/serve_receipt.hey` with the ordinary product compiler and
   compares its output (a real HTTP round trip);
4. negative control: rebuilds the library with pipelined leftovers never
   re-offered and requires the spec to FAIL against it.

Run it on each target you ship to (Linux runs the epoll backend; a Mac runs kqueue).

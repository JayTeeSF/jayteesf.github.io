# hey_web performance notes

**2026-07-25 addendum (v0.99.402a):** the delegation sidecar landed.
Stdlib/pkg calls from compiled code now cost ~60-80 us (was 4-8 ms);
`HeyWebClient.get` is ~3.6 ms on localhost (was 12-24 ms). The guidance
below is retained for history; the fast-transport example is now a
hot-path option rather than a necessity, and `workers: 4` (not 1) is
the right default since v0.99.399a fixed dispatch-path cloning.


Measured 2026-07-23 on hey 0.99.390a (darwin-arm64) against a local
`stdlib:Web` application (war-room-prayer-compass), using that repo's
`bench/benchmark.hey` harness plus `oha` as an independent cross-check.
Re-measure before trusting these numbers on newer toolchains; both gaps
below are queued upstream.

## Client: the interpreter delegation boundary

Every call from compiled application code into a pure-Hey stdlib or
package function (anything imported via `stdlib:` or `pkg:`) is delegated
to the interpreter at roughly **7 ms per call**. Runtime builtins with
native LLVM lowering (`Net.connect_host`, `Net.write_all`,
`Net.read_some_timeout`, `Net.close_fd`, `len`, `slice`, `parse_int`, ...)
and functions reached through *relative* imports compile natively and cost
microseconds.

Consequences for hey_web users:

- One `HeyWebClient.request` costs 12-24 ms on localhost regardless of
  server speed: one delegation to enter the client, then interpreted
  execution inside (including `Net.write_all_timeout`, which has no native
  lowering).
- For latency-critical plain-HTTP paths (benchmarks, health probes, tight
  service-to-service loops) vendor `examples/fast_transport.hey` into your
  app and import it relatively: ~0.4 ms per request, 40-60x faster.
- Keep using `HeyWebClient` for HTTPS, redirects, downloads, and anything
  where 20 ms does not matter; it is the complete, bounded, safe client.

## Server: worker count scales inversely (for now)

`Web.serve(routes, {workers: N})` throughput on an M-series Mac,
`GET` 364-byte JSON, 16 concurrent connections (`oha`):

| workers | requests/sec | p50 latency |
|---|---|---|
| 1 | 5,977 | 2.6 ms |
| 2 | 3,776 | 4.1 ms |
| 4 | 2,251 | 7.0 ms |
| 6 | 1,755 | 9.1 ms |
| 8 | 1,589 | 10.0 ms |

The poll-worker-pool scheduler contends; every added worker currently
subtracts throughput. Until that changes upstream, configure
**`workers: 1`** and treat larger values as a regression to re-test on
each toolchain release. POST throughput roughly doubles at `workers: 1`
as well (the "slow POST" anomaly was pool contention).

## Server: no keep-alive, and response size costs

- The runtime web server always answers `connection: close`
  (hey_runtime.c:3897); there is no keep-alive anywhere in the stack yet,
  so every request pays connection setup. Client keep-alive settings are
  ignored.
- Response latency grows roughly 0.2 ms per KB of body on localhost
  (364 B: 4 ms p50; 20 KB: 7 ms; 35 KB: 12 ms at 16 connections). Serving
  pre-compressed or trimmed assets matters more than caching file reads
  (`read()` itself is cheap).

## Benchmarking your own app

Copy `bench/benchmark.hey` and `bench/probes/` from
war-room-prayer-compass (documented in its `docs/BENCHMARKING.md`), point
`--url` at your server, and cross-check with a native tool such as `oha`
so client-side cost and server capacity stay distinguishable.

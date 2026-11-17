# hey_poller design

## The rule

`Poller.backend_for(os)` is the whole policy, a pure function so a spec can
check it for every OS on any host:

- `linux` → `epoll` (hey_epoll)
- `darwin`, `freebsd`, `openbsd`, `netbsd`, `dragonfly` → `kqueue` (hey_kqueue)
- `windows`, `windows_nt` → `iocp` (hey_iocp, experimental)
- anything else → `''`, and `open()` fails with `poller_unsupported_os`

(case-insensitive, on `Env.os()`'s spelling). The rule never answers
`io_uring`: hey_io_uring is selected only by name (`options.backend` or
`HEY_POLLER_BACKEND`), until an x86 measurement says it should be Linux's
default. `Poller.backend()` applies it
to `Env.os()` unless `HEY_POLLER_BACKEND` names a backend; `open()` also takes
`options.backend`. An override is how bench/compare runs hey_epoll's kqueue
path on a Mac, and how a deployment could pin a backend.

## io_uring: asked for, with a fallback

`Poller.open(..., {backend: 'io_uring'})` opens hey_io_uring. If it refuses
for a reason the OS's own backend does not share (not Linux, no library,
`io_uring_blocked` by seccomp, `io_uring_disabled`, `io_uring_not_in_kernel`,
`io_uring_kernel_too_old`, `io_uring_missing_feature`, `io_uring_no_memory`,
`io_uring_setup_failed`, a library that does not load), open() opens
`backend_for(Env.os())` instead (epoll on Linux) with the listening options
only, writes `Poller.fallback_line` to stderr, and returns a loop whose
`backend` is the one serving, `requested` is `io_uring` and `fallback` is
`{code, message}`. A port in use or a bad address is returned as is: the
fallback would fail the same way. `strict: true` (or `HEY_POLLER_STRICT=1`,
which the option overrides) returns the io_uring error instead.

One behaviour differs and callers can see it: hey_io_uring's `send()` queues
and the next `wait()` writes (one submit per batch). A serving loop calls
`wait()` after its batch, so nothing changes for it; code that reads its own
reply on the same thread (specs, examples) waits once first.

## Why at open(), not at compile time

Hey 0.99.601a has nothing to select with at compile time:

- imports are static string literals; a runtime value cannot choose one, and
  every imported module is compiled on every target;
- `hey-package.json` dependencies have no OS or target qualifier;
- there is no compile-time constant for the target OS (`Env.os()` is a
  runtime call).

So hey_poller depends on all three backend packages and imports their Hey
porcelain unconditionally. That costs a few hundred lines of Hey source per
binary, nothing per request. The part that must be per-OS is per-OS:

- **build**: `bin/build-native` applies the same rule to `uname -s` and builds
  only that backend's native library (the others could not build there anyway:
  each backend's C refuses the wrong OS with `#error`);
- **load**: `open()` calls only the selected backend's `open`, which finds and
  loads only its own library.

## No dispatch on the hot path

The backends declare the same native function table in their
`hey.native.json` (`open, close, wait, next, data, send, drop, port, stats,
backend`, identical argument and return types), and each backend's loop record
carries `extension` and `handle`. Poller keeps those two in its own loop
record, so `wait`/`next`/`data`/`send`/`drop`/`stats` are one `Native.call` on
the loaded extension, exactly what the backend's own porcelain does, with no
branch on the backend. Only `open` and `close` go through the backend module.
Keeping that table identical is a contract between the four packages;
selection_spec and roundtrip_spec break if a backend drifts.

## Measurements

wrk, 4 threads, 64 connections, `bench/server.hey` compiled with `heyc build`.

macOS (Apple M3 Pro, quiet machine, 10 s x 3, keep-alive):

| server | req/s | p99 | server CPU | req/CPU-s |
|---|---|---|---|---|
| Poller → kqueue | 177.4k-178.1k | 0.44 ms | 1.0 core | 178k |
| `Kqueue` directly (hey_kqueue 0.1.0) | 177.1k-177.3k | 0.44 ms | 1.0 core | 177k |
| Poller forced to hey_epoll (its kqueue path) | 176.4k-176.6k | 0.44 ms | 1.0 core | 177k |
| `Web.serve` workers=1 | 186.7k-188.2k | 0.48-0.50 ms | 4.3-4.4 cores | 43k |
| `Web.serve` workers=0 | 185.7k-190.3k | 0.42-0.57 ms | 4.3-4.5 cores | 43k-44k |

A new connection per request (8 s x 3): Poller → kqueue 77k-78k requests per
CPU-second, hey_epoll's kqueue path 69k-70k.

Linux (`bin/linux-check --bench`: Rancher Desktop VM, the amd64 toolchain
image under Rosetta, wrk in the same container, 5 s x 2, keep-alive). Absolute
numbers are not representative of native Linux; rows compare with each other:

| server | req/s | p99 | server CPU | req/CPU-s |
|---|---|---|---|---|
| Poller → epoll | 120.4k-123.1k | 0.77-0.91 ms | 1.0 core | 120k-123k |
| `Epoll` directly (hey_epoll 0.1.1) | 80.3k-81.5k | 0.95-1.19 ms | 1.0 core | 80k-81k |
| `Web.serve` workers=1 | 57.2k-58.0k | 2.3-2.5 ms | 7.7 cores | 7.6k |
| `Web.serve` workers=0 | 56.3k-57.1k | 2.3-2.7 ms | 7.6-7.7 cores | 7.6k |

Poller is faster than `Epoll` directly there because it skips a layer: `Epoll.wait`
calls `EpollNative.wait`, which calls `Native.call`; Poller calls `Native.call`.
Natively on the Mac that layer costs nothing measurable; under translation
each Hey call costs more and it shows.

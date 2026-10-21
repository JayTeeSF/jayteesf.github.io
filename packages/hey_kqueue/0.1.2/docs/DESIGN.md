# hey_kqueue design

hey_kqueue keeps hey_epoll's contract exactly (same calls, same batch
semantics, same text hand-over, same limits) and changes only what kqueue
lets a loop do better than a port of epoll code.

## One wait()

1. carry forward connections the program did not take and pipelined leftovers;
2. one `kevent(kq, changelist, n, events, 1024, timeout)` call: it **applies
   every registration queued since the last wait** and collects up to 1024
   events (timeout 0 when anything was carried);
3. a change the kernel refused comes back as an `EV_ERROR` event and closes that
   connection;
4. on the listener: `accept()` as many times as the event's `data` says
   connections are pending, read each new socket at once (clients send the
   request with the handshake) and queue its `EVFILT_READ | EV_CLEAR`
   registration into the changelist;
5. on a connection: flush queued output on `EVFILT_WRITE`; on `EVFILT_READ`
   read until a short read (to EOF when `EV_EOF` is set);
6. every connection with unconsumed input joins the batch.

## The changelist

hey_epoll's kqueue path makes one `kevent()` per registration (each accept, each
write-interest arm). hey_kqueue appends them to a 64-entry changelist and hands
it to the kernel with the next wait. kqueue evaluates a filter when it is
attached, so input that arrives between `accept()` and the registration still
raises an event (the `changelist` negative control proves the spec notices
when registrations are lost). When the changelist is full it is flushed at once
with `EV_RECEIPT`, which applies the changes without draining pending events.

A closed descriptor number can be handed out again by the next `accept()` before
the changelist reaches the kernel, so closing a connection removes its queued
changes.

## Inherited socket options

On macOS and the BSDs an accepted socket inherits `O_NONBLOCK`, `SO_NOSIGPIPE`
and `TCP_NODELAY` from the listener (measured on macOS 26 with a C probe before
relying on it). They are set once on the listener; the first accept of each loop
checks `O_NONBLOCK` and, on a kernel that does not inherit, falls back to
setting all three per socket (`stats().inherits` says which). Per accept this
leaves `accept()` + `fcntl(FD_CLOEXEC)` instead of hey_epoll's accept + three
`fcntl` + two `setsockopt`. The BSDs use `accept4(SOCK_NONBLOCK|SOCK_CLOEXEC)`.

## Buffers and limits

As hey_epoll 0.1.1: a 64-byte record per descriptor; input and output buffers
exist only while there is unconsumed input or unsent output; unconsumed input
is capped at 1 MiB; the hand-over is UTF-8 text without NUL (anything else
closes the connection).

## Measurements

Apple M3 Pro (12 cores), macOS 26, Hey 0.99.601a, product compiler
(`heyc build`), wrk 4 threads, 64 connections, a 2-byte `ok` body, server and
wrk on the same machine. `server CPU` is the server process's user+system time
over the round; `req/CPU-s` is requests per server CPU-second.

**Quiet machine** (hey_poller's `bench/compare`, 2026-10-13 19:30, which builds
the same server three ways: through hey_poller, against `Kqueue` directly, and
through hey_poller forced to hey_epoll's kqueue path):

| keep-alive, 10 s x 3 | req/s | p99 | server CPU | req/CPU-s | RSS |
|---|---|---|---|---|---|
| hey_kqueue 0.1.0 (direct) | 177.1k-177.3k | 0.44 ms | 1.0 core | 177k | 2.7 MB |
| hey_kqueue via hey_poller | 177.4k-178.1k | 0.44 ms | 1.0 core | 178k | 1.9 MB |
| hey_epoll 0.1.1 kqueue path | 176.4k-176.6k | 0.44 ms | 1.0 core | 177k | 1.9-2.6 MB |
| stdlib `Web.serve` workers=1 | 186.7k-188.2k | 0.48-0.50 ms | 4.3-4.4 cores | 43k | 11 MB |
| stdlib `Web.serve` workers=0 | 185.7k-190.3k | 0.42-0.57 ms | 4.3-4.5 cores | 43-44k | 10.8 MB |

| new connection per request, 8 s x 3 | req/s | server CPU | req/CPU-s |
|---|---|---|---|
| hey_kqueue via hey_poller | 36.6k-37.8k | 0.48-0.49 cores | 77k-78k |
| hey_kqueue (direct) | 35.0k-36.6k | 0.46-0.48 cores | 76k-77k |
| hey_epoll 0.1.1 kqueue path | 35.1k-35.5k | 0.50-0.51 cores | 69k-70k |

(Under churn the client and macOS ephemeral ports cap everyone near 37k req/s;
wrk counts the server's closes as read errors.)

**Busy machine** (this package's `bench/macos`, earlier the same day, with
other builds running): keep-alive hey_kqueue 156k-169k req/s vs hey_epoll's
kqueue path 130k-150k, and 134k-139k vs 129k-132k with the order reversed;
Web.serve 167k-172k on 3.2-3.3 cores with a 7-10 ms p99. Those 3-12% gaps did
not survive the quiet run and are noise, not a property of either loop.

Reading: in keep-alive steady state the loop makes almost no registrations, so
the kqueue-specific work changes nothing measurable; it pays under connection
churn, about 10% less CPU per request. Both loops are single-threaded and
syscall-bound (a `sample` profile spends ~65% in `sendto`/`recvfrom`): one core
serves what `Web.serve` serves with four. A profile also shows
`getenv("HEY_CAPABILITY_PROFILE")` on every `Native.call` (~6% of samples);
that is a Hey runtime cost reported to the Hey team, not something this
package can avoid.

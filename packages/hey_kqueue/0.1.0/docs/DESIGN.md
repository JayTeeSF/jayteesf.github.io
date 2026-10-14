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
(`heyc build`), `bench/macos`: wrk 4 threads, 64 connections, 10 s rounds, a
2-byte `ok` body, server and wrk on the same machine (other work was running on
it, so treat a few percent as noise).

Keep-alive, kqueue first (3 rounds):

| server | req/s | p99 | server CPU | req per CPU-second | RSS |
|---|---|---|---|---|---|
| hey_kqueue 0.1.0 | 156k-169k | 0.78-0.96 ms | 1.0 core | 159k-172k | 1.9 MB |
| hey_epoll 0.1.1 kqueue path | 130k-150k | 1.0-1.25 ms | 1.0 core | 135k-153k | 1.9 MB |
| stdlib `Web.serve` workers=1 | 167k-170k | 8-10 ms | 3.2-3.3 cores | 52k | 10 MB |
| stdlib `Web.serve` workers=0 | 168k-172k | 7-8.5 ms | 3.2-3.3 cores | 52k | 10.8 MB |

Keep-alive, hey_epoll first (`--reverse`): hey_kqueue 134k-139k req/s
(140k-142k per CPU-second), hey_epoll's kqueue path 129k-132k (135k-137k).

Connection per request (`--close`, 8 s rounds; the client side and macOS
ephemeral ports limit everyone to about 30k req/s): hey_kqueue 30.4k-30.7k req/s
at 0.55 cores (55.6k-56.6k per CPU-second), hey_epoll's kqueue path the same
req/s at 0.59-0.60 cores (51.7k-51.8k per CPU-second). Web.serve stalled in
this mode (64 connect errors; 9.9k req/s in its first round, then 0).

Reading: on keep-alive load the steady state makes almost no registrations, so
the changelist matters little and the gain is 3-12% depending on run order; on
churn it is about 9% less CPU per request. Both loops are single-threaded and
syscall-bound (a `sample` profile spends ~65% in `sendto`/`recvfrom`); one
loop on one core matches `Web.serve` using three. A profile also shows
`getenv("HEY_CAPABILITY_PROFILE")` on every `Native.call` (~6% of samples);
that is a Hey runtime cost reported to the Hey team, not something this
package can avoid.

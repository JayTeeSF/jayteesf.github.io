# Roadmap

## The kqueue path and hey_kqueue (decided 2026-10-13)

hey_kqueue (macOS/BSD) and hey_poller (picks hey_epoll on Linux, hey_kqueue on
macOS/BSD, hey_iocp on Windows) now exist. hey_epoll's own kqueue path stays,
unchanged, for the whole 0.1.x line:

- **0.1.x keeps Linux epoll + the Darwin/BSD kqueue path.** hey_fast_web pins
  0.1.1 and develops on a Mac through that path; published versions are
  immutable, so 0.1.1 keeps working whatever happens here, but a 0.1.x release
  that dropped kqueue would break anyone who moves to it with `^0.1`.
  The kqueue path gets no further work: improvements land in hey_kqueue
  (registrations batched into the wait's `kevent`, inherited socket options:
  the same keep-alive throughput as this path on an M3 Pro, about 10% less CPU
  per request under connection churn).
- **0.2.0 becomes Linux-only** once hey_fast_web (and anything else that pins
  hey_epoll directly) has moved to hey_poller or added hey_kqueue for macOS.
  It removes the `#else` kqueue half of `native/hey_epoll.c`, makes
  `bin/build-native` refuse non-Linux hosts, adds `Epoll.backend()` (the call
  hey_kqueue and hey_iocp have) and makes `Epoll.open` return
  `epoll_unsupported_os` off Linux, matching the other two backends.

New code should depend on hey_poller, not on hey_epoll directly.

## Next

- io_uring backend behind the same calls (multishot accept and receive,
  provided buffers, registered files), chosen at open; epoll stays the fallback
  where io_uring is blocked (Docker's default seccomp profile blocks it). If it
  lands, hey_poller selects it on Linux.
- IPv6 listeners (with hey_kqueue and hey_iocp, so the API stays equal).
- Optional idle deadline per connection.

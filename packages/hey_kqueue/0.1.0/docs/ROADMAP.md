# Roadmap

- Several cores on macOS. `SO_REUSEPORT` binds several listeners to one port
  but Darwin does not spread connections across them, so today a single loop
  serves one core. Options: one accepting loop handing descriptors to worker
  loops, or one listener registered in several kqueues. Measure first: the
  single loop already serves 156k-169k keep-alive req/s on an M3 Pro core.
- IPv6 listeners (with hey_epoll and hey_iocp, so the API stays equal).
- Optional idle deadline per connection (EVFILT_TIMER).
- A FreeBSD run of `bin/check` (the source builds for the BSDs by design —
  `accept4` with `SOCK_NONBLOCK|SOCK_CLOEXEC` there — but only macOS has run it).

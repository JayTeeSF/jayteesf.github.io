# Roadmap

- **The x86 decision.** hey_poller keeps epoll as the Linux default until
  hey_fast_web `single` and hey_web's readiness lane are measured on real x86
  Linux, epoll vs io_uring, at 1 and 2 CPUs. On arm64 (6.8): lane +25-32%,
  `single` a tie. If io_uring wins there,
  hey_poller selects it on Linux with epoll as the fallback (Docker's default
  seccomp profile blocks io_uring, so the fallback stays).
- **Zero-copy send** (`IORING_OP_SEND_ZC`) for replies above a few KiB, only
  if a measurement shows it; small replies lose with it.
- **Receive bundles** (Linux 6.10): several provided buffers per completion.
- **IPv6 listeners**, with the other backends so the API stays equal.
- **Idle deadline** per connection (a linked timeout), with the other backends.

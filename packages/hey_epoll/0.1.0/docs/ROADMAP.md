# Roadmap

- io_uring backend behind the same five calls (multishot accept and receive,
  provided buffers, registered files), chosen at open; epoll stays the fallback
  where io_uring is blocked (Docker's default seccomp profile blocks it).
- IPv6 listeners.
- Optional idle deadline per connection.

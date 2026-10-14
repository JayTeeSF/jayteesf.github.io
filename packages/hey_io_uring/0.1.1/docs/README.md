# hey_io_uring documentation

- [GETTING_STARTED.md](GETTING_STARTED.md): build the native library, serve a first request, or let hey_poller choose it.
- [DESIGN.md](DESIGN.md): what one `wait()` does, fixed descriptors, the buffer ring, short sends, CQ overflow, refusals, and the measurements against epoll.
- [TESTING.md](TESTING.md): what `bin/check` and `bin/linux-check` prove, with the negative controls.
- [ROADMAP.md](ROADMAP.md): the x86 decision, zero-copy send, receive bundles, IPv6.
- [examples/backend.hey](examples/backend.hey): runs anywhere; says whether io_uring can run here and why not.
- [examples/echo.hey](examples/echo.hey): Linux: one request and reply.

Prefer depending on **hey_poller**, which serves on this package when asked
(`backend: 'io_uring'`) and falls back to hey_epoll where io_uring is blocked.

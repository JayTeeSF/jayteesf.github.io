# hey_kqueue documentation

- [GETTING_STARTED.md](GETTING_STARTED.md): build the native library and serve a first request.
- [DESIGN.md](DESIGN.md): what one `wait()` does on kqueue, the changelist, inherited socket options, measurements.
- [TESTING.md](TESTING.md): what `bin/check` proves, including the two negative controls, and the benchmark.
- [ROADMAP.md](ROADMAP.md): several cores on macOS, IPv6, idle deadlines, a BSD run.
- [examples/echo.hey](examples/echo.hey): a self-contained request/reply round trip.

Prefer depending on **hey_poller**, which selects this package on macOS/BSD and
hey_epoll on Linux behind one API.

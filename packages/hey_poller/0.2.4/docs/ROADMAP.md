# Roadmap

- **Compile-time selection.** If Hey gains a per-target compile-time constant
  or per-OS dependencies in `hey-package.json` (asked of the Hey team
  2026-10-13), select there, so a Linux binary carries no kqueue/iocp porcelain.
  The runtime rule stays for `HEY_POLLER_BACKEND` overrides.
- **Windows.** Blocked on Hey: `Env.os()` reports `Unknown` on Windows (so
  `open()` fails with `poller_unsupported_os` there today), `Native.open` is
  `dlopen`-only, and there is no Windows Hey distribution. Then hey_iocp needs
  its first Windows run before hey_poller calls it supported.
- **The BSDs.** Run `bin/check` on FreeBSD (the rule selects kqueue there, but
  only macOS has run it).
- **io_uring as the Linux default**, if hey_fast_web `single` and hey_web's
  readiness lane measure faster on it than on epoll on real x86 Linux (asked
  of the linux seat 2026-10-14). 0.2.0 selects it only by name; the fallback
  to epoll stays either way (Docker's default seccomp profile blocks io_uring).
- **Several cores** stays the application's choice: one `Poller.open` per
  worker with `reuseport: true` spreads on Linux; macOS needs the hey_kqueue
  roadmap item first.

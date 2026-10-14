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
- **io_uring** on Linux if hey_epoll grows it, chosen at open with epoll as
  the fallback (Docker's default seccomp profile blocks io_uring).
- **Several cores** stays the application's choice: one `Poller.open` per
  worker with `reuseport: true` spreads on Linux; macOS needs the hey_kqueue
  roadmap item first.

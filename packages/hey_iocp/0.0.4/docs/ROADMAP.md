# Roadmap

0.0.x stays experimental until every step below has a receipt.

1. A Windows host run of `specs/windows_loop_spec.hey` and `tools/serve_receipt.hey`
   (needs Hey: a Windows runtime, `Native.open` over `LoadLibraryW`, and
   `Env.os()` = `Windows` — reported to the Hey team 2026-10-13).
2. Until then, a C-level harness of the loop under a real Windows VM
   (`./bin/hey windows azure-create` can provision one) to shake out the
   completion-port logic independently of Hey.
3. Revalidate the hand-written Win32 declarations against the Windows SDK
   headers on that host.
4. `SetFileCompletionNotificationModes(FILE_SKIP_COMPLETION_PORT_ON_SUCCESS)`
   and `AcceptEx` preallocation tuning, measured against `WSAPoll` only if
   completion ports disappoint.
5. IPv6 listeners, with hey_epoll and hey_kqueue.

Only then 0.1.0.

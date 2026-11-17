# hey_iocp design

> EXPERIMENTAL / UNVERIFIED: designed and cross-compiled, never run.

## Why I/O completion ports, not WSAPoll

- **Scale.** `WSAPoll` is `poll()`: every call passes and scans the whole
  descriptor array, O(connections) per wake-up. hey_epoll exists because a
  server holding tens of thousands of idle keep-alive connections needs a
  readiness set that reports only what changed; WSAPoll would put back exactly
  the cost the loop removes. A completion port reports only finished
  operations, and `GetQueuedCompletionStatusEx` dequeues up to 1024 of them in
  one call: the same batching as `epoll_wait`/`kevent`.
- **Correctness.** WSAPoll did not report failed connects until Windows 10 2004
  and its behaviour around `POLLHUP`/`POLLERR` differs from POSIX `poll`.
- **It is what the platform optimises** (and what Hey's own runtime uses:
  `runtime/hey_windows_iocp.c`).
- **The API fits.** hey_epoll's contract is buffered: `data()` hands over what
  arrived, `send()` takes a whole reply. Completion-based I/O needs buffers the
  kernel owns while an operation is in flight, and the loop already owns
  per-connection buffers.

## Readiness emulated on completions

The API is readiness-shaped (wait, then take what arrived). To keep hey_epoll's
memory property — an idle keep-alive connection holds no buffer — each
connection keeps one **zero-byte overlapped `WSARecv`** outstanding. It
completes when input is waiting, without the kernel holding a buffer of ours;
the loop then reads with ordinary non-blocking `recv()` until it would block,
appends to the connection's input, and posts the next zero-byte receive.

Accepts: `AcceptEx` with a receive length of 0 (a silent client cannot hold an
accept), 64 kept outstanding; each completion runs `SO_UPDATE_ACCEPT_CONTEXT`,
`FIONBIO`, `TCP_NODELAY`, associates the socket with the port, reads at once
(the request usually came with the handshake) and posts the zero-byte receive.

Sends: `send()` writes straight from the caller's text with a non-blocking
`send()` while nothing is in flight. What does not fit becomes one overlapped
`WSASend` that owns its buffer; text sent meanwhile is queued behind it and
posted when it completes (never appended into the in-flight buffer, which a
`realloc` could move).

## Lifetime

Connection ids are `generation << 32 | slot` (Windows sockets are not small
integers, so a slot table with a free list replaces hey_epoll's descriptor
index). `closesocket` cancels a connection's operations, but their completions
arrive later and point into the connection's memory, so a closed connection
becomes a *zombie* until its last operation returns. `close()` cancels
everything and drains completions for up to 5 s; anything still owned by the
kernel after that is leaked on purpose (close returns -2) rather than freed
under it.

## No SDK

Like Hey's `runtime/hey_windows_*.c`, the source declares the Win32 and CRT
entry points it uses instead of including the SDK headers, so Clang can
cross-compile it anywhere. These declarations must be revalidated against the
SDK on a Windows host (ROADMAP step 3). Large arrays live in the loop, not on
the stack, so the DLL needs no `__chkstk`; it links with `/noentry` against
msvcrt.dll for six memory functions.

# hey_epoll design

The loop keeps one record per descriptor (64 bytes) plus input/output buffers
that exist only while there is unconsumed input or unsent output, so an idle
keep-alive connection costs the kernel socket and that record.

`wait()`:
1. carries forward connections the program did not take and pipelined leftovers;
2. `epoll_wait` (or `kevent`) for up to 1024 events, timeout 0 when anything was carried;
3. on the listener: `accept4` until EAGAIN, `TCP_NODELAY`, register edge-triggered,
   and read at once (clients send the request with the handshake);
4. on a connection: flush queued output when writable; read until a short read
   (or EAGAIN; to EOF when the peer hung up);
5. every connection with unconsumed input joins the batch.

`send()` writes straight from the caller's text when nothing is queued, and
queues the remainder with write interest otherwise.

The hand-over is text because Hey strings are text: bytes that are not UTF-8,
or a NUL, close the connection rather than being altered.

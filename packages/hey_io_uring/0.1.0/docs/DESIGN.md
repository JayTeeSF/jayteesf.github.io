# hey_io_uring design

## The contract

hey_epoll's, unchanged except for when a reply is written: a batch is
`wait -> next/data -> send`, input is handed over as text with the number of
consumed bytes handed back, unconsumed input stays in the loop (partial and
pipelined requests need no Hey state), ids carry a generation, and a
connection the program did not take from a batch is offered again. The
serving functions have hey_epoll's native signatures exactly (`wait, next,
data, send, drop, port, stats, backend, close`), which is what lets
hey_poller call any backend's extension without dispatch. `open` takes four
more arguments (ring sizes); hey_poller reaches it through `IoUring.open`.

## One wait()

1. carry forward connections the program did not take and pipelined leftovers
   (the same lists as hey_epoll);
2. **prepare**: for every connection whose output changed, hand its queued
   replies to the kernel as one SEND (at most one in flight per connection;
   later replies wait behind it); close connections that asked to close once
   written; re-arm receives the kernel ended; re-arm the accept; publish the
   receive buffers given back since the last pass;
3. **one `io_uring_enter`**: submit all of it and wait for at least one
   completion (`io_uring_submit_and_wait_timeout`, or `submit_and_get_events`
   when there is carried input and no waiting);
4. **drain** every completion, then the kernel's overflow backlog if the CQ
   overflowed, and go back to 2 only if no connection has input yet and time
   is left.

So a busy loop makes one system call per batch: the replies of batch *n* go
out in the call that collects batch *n+1*.

## Accept: multishot, into fixed descriptors

One `IORING_OP_ACCEPT` with `IORING_ACCEPT_MULTISHOT` and
`IORING_FILE_INDEX_ALLOC` stays armed on the listener. Each completion
carries the **slot** the kernel picked in the ring's registered file table,
and that slot is the connection's index here (as the fd is in hey_epoll). The
socket never enters the process's descriptor table: no `fdget`/`fdput` per
operation, no descriptor-table growth, and the table is sized to the
descriptor hard limit (registered sparse at open, up to 1,048,576). A direct
descriptor cannot be given socket options from user space, so `TCP_NODELAY`
is set on the listener, which accepted sockets inherit on Linux.

When the table is full the accept ends with `-ENFILE`; it is re-armed after
the next close. Any other end (the multishot was cancelled, an error) is
re-armed by the next prepare.

### A Linux 6.8 accept defect, and how the loop avoids it

Measured on 6.8.0-47 (arm64): when a multishot accept is *issued* (armed or
re-armed) while connections are queued, it accepts them in a loop at once;
if the CQ fills during that loop, the accept that could not post its
completion fails with `-ECANCELED` **after** its socket was installed in a
fixed slot. That connection is lost: its client hangs and its slot leaks.
(Accepts from the kernel's later poll wake-ups report a full CQ correctly,
with the socket in the final completion.) With a 16-entry CQ and 300 queued
connections, 23 of 300 were lost. The loop therefore:

- sizes the CQ to at least twice the listen queue the kernel keeps
  (`backlog`, capped by `net.core.somaxconn`), so an issue-time accept of the
  whole queue fits;
- arms or re-arms the accept only when the CQ is empty and has no overflow
  backlog, and submits anything already queued first, so the accept is the
  first entry of its submit;
- counts any loss that still happens (`accept_lost`; the specs require 0).

## Receive: multishot over a provided buffer ring

Each connection has one multishot `RECV` with `IOSQE_BUFFER_SELECT` from one
buffer ring (1024 buffers of 2 KiB by default, mmap'd once). A completion's
bytes are appended to the connection's input buffer at once and the buffer
goes straight back to the ring, so a buffer is never held across batches and
an idle connection holds none. If the ring runs dry the kernel ends that
connection's receive with `-ENOBUFS`; the drain refills the ring and the next
prepare re-arms it (counted: `enobufs`, `recv_rearms`). A receive of 0 bytes
is the peer closing: the connection is closed, as in hey_epoll.

## Send: queued, one in flight, short sends resumed

`send()` copies the reply into the connection's output buffer (the kernel
reads it after `send()` has returned, so Hey's borrowed text cannot be used in
place). Prepare moves the whole output buffer into flight as one SEND. If
the completion reports fewer bytes than were in flight (a **short send**:
the socket buffer took part of it), the rest is resubmitted from that offset
(`partial_writes`). `-EAGAIN`/`-EINTR` resubmit as is; any other error closes
the connection. Replies queued meanwhile are sent after the flight completes,
so the byte order on the wire is the order of `send()` calls.

## Close

Cancelling and closing are one linked pair in the next submit:
`ASYNC_CANCEL` of everything on the fixed slot (`IORING_ASYNC_CANCEL_FD_FIXED
| ALL`, hard-linked so the close runs even when there was nothing to cancel)
then `CLOSE` of the slot. The connection's generation moves on at once, so
every completion still in flight for it is recognised as stale: a stale
receive gives its buffer back, a stale send frees the bytes it owned (kept
aside until then, never freed while the kernel may read them).

`IoUring.close()` writes what is queued (up to a second), closes every
connection, cancels everything, and waits (up to two seconds) for the kernel
to finish every request before unregistering the buffer ring and freeing
memory the kernel might still touch. If the kernel does not finish in time it
leaks those buffers rather than free them (`close` returns 1).

## Completion-queue overflow

The CQ defaults to four times the SQ (4096 / 16384), and at least twice the
listen queue (above). Open refuses a kernel
without `IORING_FEAT_NODROP`: with it, completions that do not fit are kept
in a kernel list and `IORING_SQ_CQ_OVERFLOW` is set, instead of being
dropped. Every drain checks that flag after emptying the CQ and calls
`io_uring_get_events` to move the backlog in, until it is empty (bounded per
wait). `cq_overflow_flushes` counts it; `cq_dropped` reports the kernel's
own count of lost completions, which NODROP keeps at 0 except when the kernel
cannot allocate. A full SQ mid-batch is submitted early (`early_submits`);
`-EBUSY`/`-EAGAIN` from a submit is retried after the next drain.

## Open: detect, refuse by name, never crash

In order, each failing with a named error and no ring left behind:

1. not Linux (porcelain) — `io_uring_unsupported_os`; no library — `io_uring_native_library_missing`;
2. kernel older than 6.0 (multishot receive) — `io_uring_kernel_too_old`;
3. `kernel.io_uring_disabled` = 2 — `io_uring_disabled`;
4. `io_uring_setup`, with `SINGLE_ISSUER | DEFER_TASKRUN` (6.1), falling back
   to `SINGLE_ISSUER | COOP_TASKRUN` (6.0), then `COOP_TASKRUN`, then none:
   `EPERM` is `io_uring_disabled` when the sysctl is 1, else
   `io_uring_blocked` (seccomp — Docker's default profile — or an LSM);
   `ENOSYS` is `io_uring_not_in_kernel`; `ENOMEM` is `io_uring_no_memory`;
5. features `NODROP`, `EXT_ARG`, `FAST_POLL`, `SUBMIT_STABLE` and opcodes
   `ACCEPT, RECV, SEND, CLOSE, ASYNC_CANCEL` — `io_uring_missing_feature`;
6. the sparse fixed-file table and the buffer ring register —
   `io_uring_missing_feature`;
7. the multishot accept is submitted at once; an immediate `-EINVAL` is
   `io_uring_missing_feature`.

The reason is kept per thread and read by the porcelain right after a failed
open (`open_error`); `probe` runs steps 2-6 on a small ring without a listener
(`IoUring.available`).

## liburing, statically

liburing 2.4+ (Alpine 3.21 packages 2.8 as `liburing-dev`), rather than raw
system calls: the toolchain image is Alpine, which packages it, and its ring
barriers and buffer-ring/multishot helpers are the reference code for the
exact kernel ABI. `bin/build-native` links `liburing.a` into the shared
library when the archive allows it (it does on Alpine 3.21, arm64 and x64),
so nothing beyond libc is needed at run time; otherwise it links liburing.so
and says so.

## Measured

Not in this release: the epoll vs io_uring comparison (hey_fast_web `single`
and hey_web's readiness lane, 1 and 2 CPUs) is recorded in hey_fast_web's
RESULTS.md, section "io_uring vs epoll", and in the next release of these
docs. Whether io_uring becomes hey_poller's Linux default waits for the same
comparison on real x86 Linux.

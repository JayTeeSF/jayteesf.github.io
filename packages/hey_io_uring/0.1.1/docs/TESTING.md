# Testing

`bin/check` (hey-packager) runs `bin/package-check`.

## Every host (macOS included)

1. the in-source version literal equals `VERSION`; no `HeyValue` in the
   package-facing native sources;
2. `specs/porcelain_spec.hey`: `version()`, `backend()`, and `open()` /
   `available()` refusing by name (`io_uring_unsupported_os` off Linux,
   `io_uring_native_library_missing` on Linux with no library);
3. negative control: the porcelain spec must FAIL against an `io_uring.hey`
   whose OS guard was removed.

Off Linux it then prints `SKIP` for the loop: run `bin/linux-check`.

## Linux, io_uring allowed

4. `bin/build-native` (liburing static), then in the interpreter:
   - `specs/loop_spec.hey` — hey_epoll's contract: request/reply, a partial
     request held until it completes, pipelined input re-offered after a
     consuming `send`, a stale id, close-after-reply (reply then EOF),
     non-text input refused;
   - `specs/uring_spec.hey` — 300 connections through a ring of 8 SQ entries
     and 16 receive buffers, with a listen queue of 64 (the loop must raise
     the CQ to 128 entries, twice the queue): all served twice, every limit
     hit and survived (`early_submits`, `cq_overflow_flushes`, `enobufs` and
     `recv_rearms` all > 0, `cq_dropped` and `accept_lost` = 0); every peer closes and `live`
     returns to 0; an 8 MiB reply arrives whole while the kernel takes it in
     short sends (`partial_writes` > 0);
   - `specs/refusal_spec.hey` — `io_uring_kernel_too_old` (a minimum of 99.0),
     `io_uring_disabled` (a stand-in sysctl file holding 2; 1 alone is not a
     refusal), `io_uring_listen_failed` (a port another loop holds),
     `io_uring_bad_address`, and a good open after all of them;
5. `tools/serve_receipt.hey` through the ordinary product compiler: a real
   HTTP round trip;
6. negative controls — the library rebuilt with one defect, and the named
   spec must FAIL against it:
   - *pipelined*: leftovers after a consuming `send` never re-offered (`loop_spec`);
   - *short_send*: a short send taken as complete (`uring_spec`);
   - *rearm*: a receive the kernel ended never re-armed (`uring_spec`);
   - *overflow*: the overflow backlog not flushed by the drain (`uring_spec`;
     the kernel would flush it at the next wait, so what fails is the proof
     that the drain did it);
   - *peer_close*: a 0-byte receive not closing (`uring_spec`);
   - *kernel*: the version gate skipped (`refusal_spec`);
   - *sysctl*: `io_uring_disabled=2` ignored (`refusal_spec`).

## Linux, io_uring blocked (`HEY_IO_URING_CHECK=blocked`)

`specs/blocked_spec.hey` under Docker's default seccomp profile: `available()`
and `open()` (twice) say `io_uring_blocked` and the message names seccomp;
negative control: with `EPERM` no longer classified the spec must FAIL.

## bin/linux-check

Runs both Linux modes in the Hey toolchain image (`hey-toolchain:<version>-
arm64`, else `-amd64`), after `apk add liburing-dev`, from a clean copy of the
package: first with `--security-opt seccomp=unconfined`, then with Docker's
default profile. It prints the kernel it ran on.

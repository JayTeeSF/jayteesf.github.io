# The readiness lane (`poller.hey`)

hey_web serves through `stdlib:Web`'s `Web.serve` by default: a thread per
keep-alive connection, request parsing and replies in the runtime's C. That
is the fastest lane for a moderate number of busy connections and it stays
the default.

`poller.hey` is a second, opt-in lane for the other shape of traffic: many
keep-alive connections, most of them idle (browsers, mobile clients, a load
balancer's pool, long-lived API clients). It keeps every connection in one
readiness set per loop and serves whatever is ready in batches:

```text
wait (epoll / kqueue / io_uring) -> for each ready connection:
    frame_bytes (poller_http.hey) -> request_from_frame -> Web.dispatch
    -> response_bytes / head_response_bytes -> send_bytes -> next
```

`HeyWebPollerHttp.request_from_frame` and `Web.dispatch` preserve the same
request construction and routing `Web.serve` uses, and carry raw binary payloads
end-to-end without UTF-8 re-encoding:

- **Binary responses**: pass a `Bytes` value as the body of `Web.response(200, {'content-type': 'audio/mpeg'}, mp3_bytes)` or `Web.response(206, {'content-type': 'video/mp4', 'content-range': ...}, mp4_slice)`. `HeyWebPollerHttp.response_bytes` writes the exact `Bytes` slice with zero `strlen` or UTF-8 validation (`HEAD` requests preserve the `Content-Length` of the `Bytes` body while sending zero body bytes).
- **Binary request bodies**: `request.body_bytes` always holds the exact raw `Bytes` slice of the request body (including non-UTF-8 and `0x00` NUL bytes, e.g. `.apkg` ZIP uploads); `request.body` holds the decoded UTF-8 `String` when valid UTF-8 without NUL bytes, and `''` otherwise.

## Use it

```hey
import 'pkg:hey_web/main'
import 'pkg:hey_web/poller'

program
  let app = HeyWeb.application('cards', routes, {...config, workers: 2})
  let served = HeyWebPoller.serve_application(app)   # instead of HeyWeb.serve(app)
end
```

`workers` is the number of loops; they share the port with SO_REUSEPORT
(Linux spreads connections across them; macOS does not, so use one loop
there). The event loop comes from the `hey_poller` package (epoll on Linux, kqueue on
macOS/BSD, io_uring on Linux by name; Windows is experimental there). Build the one native library your
OS needs once: `.hey/packages/hey_poller/0.2.5/bin/build-native --project .`,
and run the program from the project root (or set `HEY_EPOLL_LIBRARY` /
`HEY_KQUEUE_LIBRARY` / `HEY_IO_URING_LIBRARY`).

## When not to use it

Handlers run on the loop's own thread. A handler that blocks (a slow query,
an outbound HTTP call, a large file read) stalls every connection on that
loop until it returns. Keep handlers fast and move slow work into Jobs, as
the README already recommends, or stay on the default lane.

Not supported on this lane: chunked request bodies (411), request heads over
64 KiB (431). Request bodies over `max_body_bytes` get 413. Idle connections
are kept until the client closes them.

## Measured

See the README's "Engines compared" table: throughput on few busy
connections, and memory and threads with many open connections, on macOS
and in a Linux container.

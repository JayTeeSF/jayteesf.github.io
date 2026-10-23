# Architecture

## Boundary

`stdlib:Http` owns protocol data, URL parsing, HTTP/HTTPS transport, redirects, and downloads. `stdlib:Web` owns request/response values, route dispatch, listeners, and worker-pool serving. `hey_web` owns application composition (the flat route table, the fast-lane request/response modules, pages embedding) and command ergonomics.

This boundary avoids the central failure of `hey_web` 0.1.1: it carried its own client wire logic and server planning assumptions from before `stdlib:Web` became the official network boundary.

## One serving lane

`hey_web` serves exactly one way (maintainer ruling, 2026-07-30): `Web.serve(routes, {host, port, workers, request_timeout_ms, max_body_bytes})` over a flat route table -- the RecallCoach production pattern. The 0.1.x-0.2.x middleware serving lane (`Web.service` + `Web.start`, `Web.stack`, the config `middleware` list) is deleted: `Web.service` is JSON-delegated in compiled binaries, so that lane never invoked a registered handler when compiled. See README's removal table for every deleted call and its replacement.

## Application shape

An application is a plain value containing a name, configuration, and source-declared routes (`application.routes`, the flat table `Web.serve` and `Web.dispatch` take directly). Controllers are modules with functions; cross-cutting request behavior (security headers, access logging, remote-ip, body parsing) lives in the fast-lane modules called from handlers, not in a stack. Models should live in app modules built over `hey_record`. Durable work should live in Jobs.

## Configuration

Operational configuration may be loaded from `config/hey_web.json` and carries only the serve options. Routes cannot safely be named by strings because compiled Hey callables are the dispatch identity; handlers are plain named single-argument functions resolved by name.

## Production stance

Run the native Hey HTTP/1.1 worker-pool server behind a TLS reverse proxy until the server-side TLS termination contract is completed. Keep body and timeout limits explicit. Use Jobs for slow side effects.

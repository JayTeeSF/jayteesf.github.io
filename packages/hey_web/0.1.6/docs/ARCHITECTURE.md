# Architecture

## Boundary

`stdlib:Http` owns protocol data, URL parsing, HTTP/HTTPS transport, redirects, and downloads. `stdlib:Web` owns request/response values, route dispatch, middleware execution, listeners, and worker-pool serving. `hey_web` owns application composition and command ergonomics.

This boundary avoids the central failure of `hey_web` 0.1.1: it carried its own client wire logic and server planning assumptions from before `stdlib:Web` became the official network boundary.

## Application shape

An application is a plain value containing a name, configuration, source-declared routes, and a compiled middleware stack. Controllers are modules with functions. Models should live in app modules built over `hey_record`. Durable work should live in Jobs.

## Configuration

Operational configuration may be loaded from `config/hey_web.json`. Routes and arbitrary custom middleware cannot safely be named only by strings because compiled Hey callables are the dispatch identity. Built-in middleware names are mapped explicitly.

## Production stance

Run the native Hey HTTP/1.1 worker-pool server behind a TLS reverse proxy until the server-side TLS termination contract is completed. Keep body and timeout limits explicit. Use Jobs for slow side effects.

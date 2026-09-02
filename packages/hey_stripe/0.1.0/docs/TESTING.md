# Testing

`bin/check` runs the canonical `hey_packager` gate, which invokes
`bin/package-check`:

- `specs/form_spec.hey` — Stripe field names + percent-encoding.
- `specs/client_spec.hey` — the client refuses to transport without an API key.
- `specs/webhooks_spec.hey` — webhook verification fails closed and preserves
  raw-body signature policy.

`specs/live_http_probe.hey` is an optional, opt-in live probe (real Stripe
sandbox key) and is not part of the offline gate.

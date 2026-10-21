# Design

> Minimal stub, added when this package adopted hey_packager 0.1.7 (whose
> `bin/check` requires the docs set). The authoritative text is the
> top-level [README.md](../README.md).

One module per concern: `form.hey` (form encoding), `client.hey`
(HTTP transport), `checkout.hey`, `portal.hey`, `subscriptions.hey`,
`webhooks.hey`, and `main.hey` which imports them all.

Webhook signature verification stays behind a host crypto adapter until
`stdlib:Crypto` exposes HMAC-SHA256. See "Security rules" in the
top-level README.

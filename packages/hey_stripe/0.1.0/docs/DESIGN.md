# Design

- `form.hey` — builds request bodies with exact Stripe field names and
  `application/x-www-form-urlencoded` percent-encoding.
- `client.hey` — the HTTP client boundary over `stdlib:Http`; requires an API
  key before transport and never logs secrets.
- `checkout.hey` / `portal.hey` / `subscriptions.hey` — Checkout Session,
  Billing Portal, and subscription-read helpers.
- `webhooks.hey` — event classification and HMAC signature verification over
  the raw body; fails closed.

MMeoww owns entitlement truth: Stripe events are provider signals resolved by
the application, not authoritative entitlements on their own.

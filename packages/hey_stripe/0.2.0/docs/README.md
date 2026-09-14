# hey_stripe

> Minimal stub, added when this package adopted hey_packager 0.1.7 (whose
> `bin/check` requires the docs set). The authoritative text is the
> top-level [README.md](../README.md).

Thin Stripe primitives for Hey applications: subscription and one-time
payment Checkout Session and Billing Portal Session request shapes, Stripe
HTTP transport through `stdlib:Http`, subscription status helpers, billing
webhook event classification (including refunds and chargebacks) and a
fail-closed webhook signature policy. The host
application owns users, plans, entitlements, idempotency and persistence.

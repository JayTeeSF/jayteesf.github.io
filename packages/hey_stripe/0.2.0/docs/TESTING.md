# Testing

> Minimal stub, added when this package adopted hey_packager 0.1.7 (whose
> `bin/check` requires the docs set). The authoritative text is the
> top-level [README.md](../README.md).

```sh
bin/check              # hey_packager shared checks, then bin/package-check:
                       # client.hey --check and the form, client, webhooks
                       # and checkout specs
sh bin/live-http-probe # opt-in, needs a Stripe sandbox key
```

# Testing

```sh
bin/check          # docs + manifest + specs + a runnable example
bin/package-check  # the four specs only
```

## What the specs cover

| spec | covers |
|---|---|
| `pkce_spec.hey` | the **RFC 7636 Appendix B** vector, unpadded base64url, RFC 3986 encoding including multi-byte UTF-8 |
| `providers_spec.hey` | registry defaults, Apple's quirks, readiness, unknown-provider nil |
| `claims_spec.hey` | iss / aud / exp / sub / nonce, array `aud`, issuer trailing slash, unverified-email linking |
| `flow_spec.hey` | a full success, and each of the four failure stages |

The PKCE vector is the RFC's own, so it asserts interoperability rather than
self-consistency. A challenge computed over the hex string instead of the digest
bytes passes a self-consistent test and is rejected by every real provider.

## Two cases worth keeping

`flow_spec` drives a **perfectly signed token minted for another client** and a
**replayed nonce**. Both are accepted by a naive implementation, both are
near-impossible to provoke against a live provider, and both are one fake away
here.

## What is not covered

No spec performs network I/O or native crypto — by design; those are the
injected seams. An application's binding of `exchange` and `verify` is that
application's to test.

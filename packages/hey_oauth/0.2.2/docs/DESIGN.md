# Design

## One idea: every side effect is an injected capability

Hey has no closures, so a capability is a `(function ref + context)` pair:

```
gen(gctx, n)                        -> bytes
exchange(xctx, cfg, code, verifier) -> Result(tokens)
verify(vctx, id_token, now)         -> Result(claims)
```

Everything else in this package is pure. That is what lets `specs/flow_spec.hey`
reach failure branches that are close to impossible to provoke against a real
provider — a replayed nonce, a perfectly-signed token minted for a different
client — with no network and no native crypto.

It is also why this package depends on **no crypto package**. An application
binds the verifier it already has. A hard dependency would buy nothing and would
make this the first package in the tree to exercise cross-package resolution.

## Modules

| module | owns |
|---|---|
| `pkce.hey` | RFC 7636 S256, RFC 3986 percent-encoding, base64url |
| `providers.hey` | the registry: endpoints, scopes, per-provider quirks, readiness |
| `claims.hey` | the policy that must hold even when the signature is perfect |
| `flow.hey` | start and complete, and the stage each failure stopped at |

## Two decisions worth defending

**`stage` on every failure.** `complete` returns `callback`, `exchange`,
`verify` or `policy`. "Login failed" with no stage is the least useful error an
auth system can produce, and these four are diagnosed completely differently: a
tampered state, a spent code, a bad key, a token for another client.

**Readiness is answered before redirecting.** `OauthProviders.problems` is
checked in `start`, so a misconfigured provider is an operator-visible error
rather than a user bounced to a provider that rejects them. A confidential
client with no secret is the motivating case: it redirects perfectly and dies at
the token exchange, a long way from the cause.

## What is deliberately not here

Token refresh, userinfo, logout, and dynamic client registration. Each is a real
feature; none is needed to establish who someone is, which is all this package
claims to do.

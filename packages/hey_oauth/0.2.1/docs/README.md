# hey_oauth

OAuth 2.0 / OpenID Connect **Authorization Code + PKCE** for Hey applications.

A provider registry (Google, Apple, generic OIDC), the full flow, and a claim
policy. Crypto and HTTP are injected capabilities, so the whole thing is
unit-testable without a network or a native library.

```hey
import 'vendor/hey_oauth/0.1.0/main.hey'

let cfg = OauthProviders.config('google', {
  client_id:     Env.get('MY_GOOGLE_CLIENT_ID'),
  client_secret: Env.get('MY_GOOGLE_CLIENT_SECRET'),
  redirect_uri:  'https://example.com/auth/google/callback',
})

# 1. start a login -- retain state/nonce/code_verifier SERVER-side
let started = OauthFlow.start(Crypto.random_bytes, {}, cfg)
# redirect the browser to started.value.authorize_url

# 2. complete it
let result = OauthFlow.complete(deps, cfg, callback_params, session, now)
if get(result, 'ok')
  let who = get(result, 'identity')   # {provider, subject, email, email_verified, name}
end
```

## Why the capabilities are injected

Hey has no closures, so a capability is a `(function ref + context)` pair:

```
gen(gctx, n)                        -> bytes          randomness
exchange(xctx, cfg, code, verifier) -> Result(tokens) the token endpoint
verify(vctx, id_token, now)         -> Result(claims) signature + JWKS
```

This package therefore depends on **no crypto package**. That is deliberate, not
an omission: the seam is what lets an application bind whatever verifier it
already has (`hey_jose`, say), and what lets the entire flow — including every
failure branch — be tested with fakes.

## What it will not do

**Identity comes only from the verified `id_token`.** Nothing in the callback
query — not `code`, not `state`, not an `email` parameter — ever becomes
identity. The callback is attacker-supplied input.

**An unverified email never matches an existing account.**
`OauthClaims.linkable_by_email?` requires `email_verified`, because otherwise
anyone who can register your address at a careless provider inherits your
account. Link by `(provider, subject)` alone in that case.

**`aud` is checked.** Google signs id_tokens for millions of clients with the
same keys, so a token minted for someone else's `client_id` verifies perfectly.
Without the audience check, any Google user of any app could present their token
and be admitted as that subject. This is the check people skip.

**`nonce` is checked inside the signed token**, not in the query string — which
is what makes a replayed callback fail.

## Providers

| provider | status |
|---|---|
| `google` | **works.** Plain OIDC, RS256, rotating JWKS. Sends `prompt=select_account` so a second account is actually reachable while testing. |
| `apple` | **flow ready, one capability missing.** See below. |
| `oidc` | any compliant provider; you supply issuer + endpoints. |

### Apple's three deviations, all registered

1. **The client secret is an ES256-signed JWT**, not a fixed string — signed
   with the `.p8` key, valid ≤6 months, so it *expires and must be regenerated*.
   `client_secret_kind` is `signed_jwt`. This package does not sign it; the
   caller supplies the value, because signing needs an ES256 capability the
   package deliberately does not own.
2. **The callback is a POST** (`response_mode=form_post`) whenever `name` or
   `email` scope is requested. A route registered only for GET silently
   dead-ends.
3. **Name and email arrive exactly once** — in the first authorization, in a
   `user` form field beside the code, never in the id_token and never again. Not
   persisting it on first sight loses it permanently; the only recovery is the
   person revoking the app in their Apple ID settings.

Apple also issues private relay addresses (`@privaterelay.appleid.com`). They
are real, deliverable and stable per-app. Treat them as ordinary verified
emails.

## Status

`0.1.0`. Google and the generic OIDC provider are implemented and exercised.
Apple is described and structurally supported but not yet usable end to end —
it needs an ES256 signer for the client secret.

## License

Private.

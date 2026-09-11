# Roadmap

## 0.1.0 (now)

Google and generic OIDC, Authorization Code + PKCE, the claim policy. Apple is
registered and structurally supported but not usable end to end.

## Next: make Apple work

Blocked on one capability, not on this package's design. Apple's `client_secret`
is an **ES256-signed JWT** built from the `.p8` key and valid ≤6 months, and no
Hey package currently signs ES256 — `hey_jose` exports `verify_rsa` and
`verify_ec` only. Adding `sign_ec` there unblocks it; the rest of Apple's
handling (`form_post`, first-authorization-only profile) is already in the
registry.

## Later, in rough order

- **Discovery** — read `/.well-known/openid-configuration` so a generic provider
  needs only an issuer.
- **Refresh tokens** — deliberately out of 0.1.0. Establishing identity does not
  need them; keeping a session alive does.
- **More providers** — Microsoft, GitHub. Each is a registry row plus honest
  notes about how it deviates.
- **`state` with an expiry**, so a stale login cannot be resumed days later.

## Not planned

Dynamic client registration, and anything that stores users. This package
establishes who someone is and hands that back; what an application does with it
is the application's.

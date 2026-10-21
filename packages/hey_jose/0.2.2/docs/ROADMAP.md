# Roadmap

- `Jose.JWKS` HTTP fetch with bounded size, ETag/Cache-Control caching,
  refresh-once-on-unknown-`kid`, rotation-safe replacement, and stampede
  protection (through a caller-provided fetch or `stdlib:Http`).
- Additional curves/algorithms as providers require them.
- Property/fuzz coverage for the compact parser and base64url decoder.

The current release covers RS256/PS256/ES256 verification, JWKS key selection
by `kid`, and the OIDC issuer/audience/expiry/nbf policy.

## 0.2.1 — package controls

- Adopts hey_packager (canonical bin/check, bin/bump, bin/release, bin/publish); release no longer publishes.

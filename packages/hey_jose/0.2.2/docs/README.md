# hey_jose documentation

`hey_jose` verifies JWTs/JWS for Hey using OpenSSL — MMeoww's Auth0/OIDC
access-token verifier.

- `docs/GETTING_STARTED.md` — build the native library and verify a token.
- `docs/DESIGN.md` — the parse/verify boundary and the security invariants.
- `docs/TESTING.md` — real RS256/ES256 vectors and adversarial cases.
- `docs/ROADMAP.md` — JWKS fetch/cache and rotation plans.
- `docs/examples/basic.hey` — a runnable, library-free policy example.

Parsing is never verification: callers receive trusted claims only from a
successful `Jose.verify`.

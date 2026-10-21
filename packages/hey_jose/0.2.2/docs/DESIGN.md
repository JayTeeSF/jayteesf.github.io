# Design

- `native/hey_jose.c` — all base64url decoding and cryptography run in OpenSSL:
  `EVP_DigestVerify` over keys built with `EVP_PKEY_fromdata`. RSA verifies
  PKCS#1 v1.5 (RS*) and PSS (PS*); EC converts the JWS raw R||S signature to a
  DER `ECDSA_SIG` for P-256/384/521. No cryptographic primitive is implemented
  in Hey.
- `Native.hey` (`JoseNative`) — a thin boundary exposing `verify_rsa`,
  `verify_ec`, and `b64url_to_text`.
- `jose.hey` (`Jose`) — parse (never trusting), JWKS key selection by `kid` +
  compatible `alg`, signature verification, then the OIDC policy.

## Security invariants

- `alg=none` is always rejected.
- The algorithm must be in the policy allow-list AND compatible with the key
  type; it is never inferred from key material.
- Verification fails closed; typed errors distinguish malformed token,
  forbidden/unsupported algorithm, unknown key, key/alg mismatch, invalid
  signature, expired, not-yet-valid, issuer/audience mismatch, and missing
  claims — without leaking secrets or raw token material.

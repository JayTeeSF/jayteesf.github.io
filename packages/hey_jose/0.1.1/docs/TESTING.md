# Testing

`bin/check` runs the canonical `hey_packager` gate, which invokes
`bin/package-check`:

1. `specs/api_spec.hey` — pure API surface (version, policy, audience matching).
2. `bin/build-native` — builds the OpenSSL-backed native library.
3. `tools/gen_vectors.py` mints real RS256 and ES256 JWTs with `openssl`, and
   `specs/native_spec.hey` verifies them end to end — asserting that valid
   tokens verify and that tampered signatures, `alg=none`, wrong audience, and
   expired tokens are all rejected with the correct typed error.

If `openssl`/`python3` are unavailable, the live crypto spec is skipped and the
pure API spec still runs.

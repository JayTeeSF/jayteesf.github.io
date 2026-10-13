# hey_secret_lint 0.1.1

A source check for Hey projects. It flags:

- `==` and `!=` on values that look secret (tokens, passwords, stored hashes,
  signatures, HMACs, digests, Authorization values, credentials, nonces, OTPs,
  CSRF tokens, session ids, cookies, API keys), and on `'Basic ...'` /
  `'Bearer ...'` literals;
- `Crypto.constant_time_equal?(a, b)` given an argument that is not visibly
  bytes. The runtime compares bytes only and answers `false` for anything
  else, so a call on two equal strings is always false.

Hey's `==` stops at the first differing byte, which tells a timer how much of
a guess was right. The fix is `Crypto.constant_time_equal?(bytes(a), bytes(b))`
today, and the Secret value kind (whose `==` is constant time) once the Hey
team ships it.

```sh
hey secret-lint                 # the project in the current directory
hey secret-lint src server      # chosen paths
hey secret-lint --include-specs # spec and test code too
hey secret-lint --exclude fixtures
```

```text
src/Routes.hey:80: == on '('Basic ' + expected)' looks like a secret; use Crypto.constant_time_equal?(bytes(a), bytes(b))
secret-lint: 1 finding in 1 file (27 .hey files scanned)
```

Exit status: 1 when anything is found, 0 when clean, 2 on a usage error.

A line that is safe on purpose carries a reason:

```hey
if supplied_token == fixture_token # secret-lint: ok both are public test values
```

A bare `# secret-lint: ok` is itself a finding.

Start with [GETTING_STARTED.md](GETTING_STARTED.md) to wire it into an app's
checks, read [DESIGN.md](DESIGN.md) for every rule and exclusion, and
[TESTING.md](TESTING.md) for the fixtures and negative controls.

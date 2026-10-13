# Design

## What it reads

Every `.hey` file under the given paths (default `.`), in sorted order. While
walking it skips directories whose name starts with `.` (so `.hey/`, `.git/`,
`.build/`), `vendor/`, `build/`, `dist/`, `tmp/`, `node_modules/`,
`generated/`, `DerivedData/`, `Pods/`, any `--exclude NAME`, and, unless
`--include-specs`, `spec/`, `specs/`, `test/`, `tests/` and files named
`*_spec.hey` / `*_test.hey`. Spec code compares tokens to assert on them
(`says first_token == second_token`); that is not an attack surface. A path
given on the command line is always read, whatever its name.

## How a line is read

Only lines holding `==`, `!=`, `constant_time_equal`, `secret-lint`, a triple
quote or `<<` are lexed; the rest are skipped by a substring test. The lexer
knows single, double and triple-quoted strings, `%q(...)` strings, heredocs
(`<<TAG`, `<<~TAG`, `<<~'TAG'`), numbers, names (with a trailing `?` or `!`),
brackets, and `#` comments, and it carries open triple-quoted strings and
heredoc bodies across lines, so text inside a string or a comment is never
taken for code.

For every `==` / `!=` the two operands are the token runs on either side, at
bracket depth 0, up to a comma, an assignment, another comparison, `and`,
`or`, `&&`, `||`, `not`, a keyword (`if`, `return`, `let`, ...) or an
unmatched bracket. Operator precedence makes `'Basic ' + expected` one
operand.

## When a comparison is flagged

Never, if either operand is safe:

| Safe operand | Why |
| --- | --- |
| `''`, `""` | a presence check, not a secret compare |
| any other plain string literal | an enum / kind check (`kind == 'password'`) |
| `nil`, `true`, `false`, numbers, `-1`, `[]`, `{}` | not a secret |
| a bare `'Bearer '` / `'Basic '` | checks a header's scheme prefix |
| a content hash: `text_hash`, `pack_hash`, `file_digest`, ... | a cache key, not a secret |

Otherwise it is flagged when either operand

- contains a string literal starting `Basic ` or `Bearer ` (case-insensitive)
  with something after the scheme or concatenated to it
  (`'Basic ' + expected`, `"Bearer #{token}"`), or
- has a term whose name looks secret (below), or
- (in a file that mentions OAuth) both operands end in the word `state`:
  `found.state != state` is the OAuth round-trip check of a nonce.

The operand reported is the left one if it matches, else the right.

### The name of a term

A term is split from its operand at `+ - * / %`. Its name is what it ends in:

- `x.field` -> `field`; `row['password_digest']` -> `password_digest`
- `Auth.secret()` -> `secret`; a call with a literal argument that names a
  secret also matches: `request.header('Authorization')`,
  `Env.default('ADMIN_PASSWORD', '')`
- wrappers that do not change the value are looked through: `.to_s`,
  `.trim`, `trim(x)`, `bytes(x)`, `lower`, `hex`, `decode`, ...
- `(...)` is unwrapped; a term starting with `!`, `not` or `-` is a boolean or
  a number and never matches.

So `token.length == 32`, `len(token) == 0` and `token.size != 64` are about
lengths and are not flagged: the name is `length` / `len` / `size`.

### Secret-looking names

The name is split into lowercase words at `_`, `-` and camelCase
(`passwordHash` -> `password hash`, `X-CSRF-Token` -> `x csrf token`).

- It matches when it ENDS in one of the phrases `key hash`, `auth header`,
  `api key`, `session id`, `private key`, `secret key`, `access key`,
  `oauth state`, `csrf state`.
- Otherwise it does not match when its LAST word names a property of a
  secret rather than the secret: `id`, `type`, `kind`, `count`, `length`,
  `size`, `name`, `label`, `at`, `url`, `path`, `expires`, `ttl`, `version`,
  `prefix`, `algorithm`, `scheme`, `status`, `state`, `error`, `key`... (see
  `sl_property_words`). `token_id`, `token_type`, `hash_algorithm`,
  `token_expires_at` are not secrets.
- Otherwise it matches when ANY word is one of: token(s), secret(s),
  password(s), passphrase, passwd, hash(es), hashed, signature(s), sig(s),
  hmac, mac (not with os / address), digest(s), authorization, credential(s),
  creds, nonce, otp, csrf, xsrf, cookie(s), apikey, bearer, jwt.
- A predicate name (ending `?`) never matches: it returns a boolean.

## constant_time_equal? arguments

`Crypto.constant_time_equal?(a, b)` (and `crypto_constant_time_equal`) is
flagged when an argument is not visibly bytes. Visibly bytes: a call to
`bytes(...)`, anything on `Bytes.` or `Crypto.`, `from_base64`,
`base64_decode`, `from_hex`, `from_text`, ..., any call or name ending in
`bytes` (`mac_bytes`). A call whose arguments run onto following lines is
joined (up to 20 lines) and reported at its first line. A variable that does
hold bytes under another name needs `# secret-lint: ok <reason>`.

## Suppression

A trailing `# secret-lint: ok <reason>` silences that line. The reason is
required: `# secret-lint: ok` alone is a finding, and so is any other
`secret-lint:` directive.

## Exit status

1 when anything is found, 0 when clean, 2 on a usage error. Hey has no
statement that sets a process exit status (`fail` always exits 70), so the
command builds the whole report as one string and hands it to `/bin/sh -c
'printf "%s" "$1"; exit "$2"'` with `Process.exec_env_argv`. Nothing is
printed before the exec, so no buffered output can be lost. This is a
package-side workaround; the Hey compiler, runtime and stdlib are unchanged.

## Known limits

- Line based. An `==` whose operands span lines is read one line at a time.
- Names, not types: a secret held in a variable called `value` is not seen,
  and a public value called `token` is. Suppress the second with a reason.
- The OAuth rule is file based: a file that mentions "oauth" anywhere (even in
  a comment) has its `state == state` pairs flagged.
- Interpolations inside double-quoted strings are not lexed as code.

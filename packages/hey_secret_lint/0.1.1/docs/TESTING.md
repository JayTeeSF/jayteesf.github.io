# Testing

`bin/check` runs hey_packager's shared checks, then `bin/package-check`:

1. `src/main.hey` `version()` must equal `VERSION`.
2. `specs/main_spec.hey` (Minispec, `heyc --test`): the secret-name detector on
   names that must and must not match, and the Authorization literal test.
3. `specs/fixtures_spec.sh`, which runs the real command
   (`bin/secret-lint.hey`) and compares its whole stdout and exit status:
   - `specs/fixtures/flagged` must print exactly `flagged.expected` and exit 1.
     It holds the exact Elders line (`return supplied == ('Basic ' +
     expected)`), the my_queue_2 OAuth state compare, a `key_hash` compare, a
     Bearer literal compare, constant_time_equal? on text (one call spread
     over lines), and a suppression with no reason.
   - `specs/fixtures/clean` must print exactly `clean.expected` and exit 0:
     presence checks, length checks, enum literals, predicates, secrets inside
     comments, strings, `%q()`, triple-quoted strings and heredocs, correct
     constant_time_equal? calls (my_queue_2 auth.hey:425, the Elders fix,
     recall_coach_app's multi-line call, MMeow's from_base64), a reasoned
     suppression, and the shapes that were false positives in real apps
     (bare scheme checks, content hashes, non-OAuth `state`).
   - A project scanned from its root skips `.hey/ vendor/ build/ dist/ tmp/
     node_modules/ generated/` and spec code; `--include-specs` and
     `--exclude` work.

## Negative controls

The fixture spec copies the package and disables one rule at a time by
inserting `return false` at the top of the function:

| Disabled | Must fail |
| --- | --- |
| `SecretLint.secret_name?` (the detector) | flagged fixtures |
| `SecretLint.auth_literal?` (Basic/Bearer) | flagged fixtures |
| `sl_paired_state?` (OAuth state) | flagged fixtures |
| `SecretLint.safe_operand?` (exclusions) | clean fixtures |
| `SecretLint.bytes_arg?` (bytes recognizer) | clean fixtures |

If a control still passes, the spec fails: that rule is not exercised. If a
marker line is not found exactly once, the spec stops, so a rename cannot make
a control vacuous.

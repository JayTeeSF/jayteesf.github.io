# Roadmap

- When the Hey team ships the Secret value kind (constant-time `==`), stop
  flagging a comparison whose operand is visibly a Secret, and suggest it in
  the advice next to `Crypto.constant_time_equal?`.
- If Hey gains a statement that sets the exit status, drop the `/bin/sh`
  hand-off in `bin/secret-lint.hey`.
- Read operands across lines for `==` the way constant_time_equal? calls are.
- Lex `#{...}` interpolations as code.

# Getting started

## Wire it into an app's checks

1. Add the dependency to the app's `hey-package.json`:

   ```json
   "dependencies": {
     "hey_secret_lint": "^0.1.1"
   }
   ```

2. Lock and install it:

   ```sh
   "$HEY_ROOT/bin/hey" package ensure --project . --update-lock
   ```

   `hey.lock.json` now lists the `secret-lint` command
   (`hey package commands --project .`).

3. Run it from the app's `bin/check` (it exits 1 on any finding):

   ```sh
   (cd "$ROOT" && "$HEY_ROOT/bin/hey" secret-lint .)
   ```

`hey secret-lint` resolves the command from the project's lock, so it runs the
locked version, with no network access.

## Running it without adding a dependency

Point the package's command at any tree; it only reads files:

```sh
"$HEY_ROOT/bin/heyc" path/to/hey_secret_lint/bin/secret-lint.hey --run -- ~/dev/some_app
```

## Fixing a finding

```hey
# before
return supplied == ('Basic ' + expected)

# after
return Crypto.constant_time_equal?(bytes('' + supplied), bytes('Basic ' + expected))
```

Keep presence checks (`if expected == ''`) as they are: they compare against a
constant, not a secret, and are never flagged.

When a comparison is safe on purpose (both sides public, a test value), say
why on the line: `# secret-lint: ok <reason>`.

## As a library

```hey
import 'pkg:hey_secret_lint@0.1.1/main'

program
  for line in SecretLint.scan_text('Routes.hey', source)
    says line
  end
end
```

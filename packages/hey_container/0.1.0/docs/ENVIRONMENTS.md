# The environment matrix

See README.md for the full table and knobs. This file exists as the
one-page answer to "which image does my HEY_ENV get".

| `HEY_ENV` | image target | built by |
|---|---|---|
| `development` | `development` | `hey-container dockerfile --env development` |
| `test` | `test` | `hey-container dockerfile --env test` |
| `staging` | `release` | `hey-container dockerfile --env staging` |
| `production` | `release` | `hey-container dockerfile --env production` |

The last two produce **the same bytes**. Verify it yourself:

```sh
./bin/hey-container dockerfile --env staging    --out /tmp/a
./bin/hey-container dockerfile --env production --out /tmp/b
cmp /tmp/a /tmp/b && echo identical
```

`HeyContainerDockerfile.release(options)` takes no environment argument,
so there is no code path from an environment name to a differing release
render. That is the enforcement; the `cmp` above is the receipt.

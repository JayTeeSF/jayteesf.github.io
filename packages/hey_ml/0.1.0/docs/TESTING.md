# Testing

Run the canonical package gate:

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
export HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"
bin/check
```

The package check runs vector, linear-model, bandit, and contextual-policy specs
on the ordinary Hey compiler and validates the package surface.

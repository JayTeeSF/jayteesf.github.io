# Getting started

Install or unzip the package source under `$HOME/dev/hey_mobile`, then configure Hey and the shared packager:

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
export HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"
cd "$HOME/dev/hey_mobile"
bin/check
```

Import the package at the exact released version shown in `VERSION` after installation through the Hey package manager.

## Release workflow

```sh
bin/check
bin/release
unzip -tq "dist/hey_mobile-0.1.2.zip"
bin/source-zip
bin/publish --no-commit
```

`bin/publish` refuses to overwrite an existing version and defaults to `$HOME/dev/jayteesf.github.io/packages`.

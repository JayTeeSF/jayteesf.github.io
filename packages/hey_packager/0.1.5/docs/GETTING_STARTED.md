# Getting started

Set the Hey checkout when it is not in the canonical location:

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
```

From any package repository:

```sh
$HOME/dev/hey_packager/bin/hey-packager check .
$HOME/dev/hey_packager/bin/hey-packager release .
$HOME/dev/hey_packager/bin/hey-packager publish .
```

Generated package projects provide shorter wrappers:

```sh
bin/check
bin/package-zip
bin/publish
bin/release
bin/source-zip
```

## Release workflow

```sh
bin/check
bin/release
unzip -tq "dist/hey_packager-0.1.3.zip"
bin/source-zip
bin/publish --no-commit
```

`bin/publish` refuses to overwrite an existing version and defaults to `$HOME/dev/jayteesf.github.io/packages`.

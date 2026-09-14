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
bin/bump
bin/check
bin/package-zip
bin/publish
bin/release
bin/source-zip
bin/update_packages
```

## Declare where the version is repeated

If the version appears anywhere besides `VERSION` and `hey-package.json`, list
each place in `hey-version-files` as `PATH [MARKER]`; only lines containing
MARKER are touched:

```text
main.hey return '
docs/README.md # my_package
```

Preview a bump before making it, then make it:

```sh
bin/bump patch --dry-run
bin/bump patch
```

The bump reads every declared copy back and restores everything if one was
missed. For anything a fixed rule cannot express, add an executable
`bin/package-bump`; it runs after the declared copies move, with the old and new
versions as its two arguments. `bin/bump --help` has the details.

## Release workflow

```sh
bin/bump patch
bin/check
bin/release
unzip -tq "dist/hey_packager-0.1.9.zip"
bin/source-zip
bin/publish
```

`bin/release` builds artifacts only. `bin/publish` refuses to overwrite an existing version, defaults to `$HOME/dev/jayteesf.github.io/packages`, and commits the new version in the registry checkout without pushing.

Both run the full check first and stop if it fails. `bin/release --no-check`
builds anyway and prints a warning. `bin/publish` does not accept `--no-check`:
a published version can never be replaced. Its emergency override,
`--emergency-publish-unchecked`, prints the same warning and writes `UNCHECKED`
into the registry commit message.

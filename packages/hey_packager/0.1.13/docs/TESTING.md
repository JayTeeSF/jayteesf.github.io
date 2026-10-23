# Testing

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
bin/check
```

`bin/check` runs `specs/commands_spec.sh`, which tests `bump`, `hey-version-files`,
`bin/package-bump`, the check in front of `release` and `publish`, redundant root
arguments, and `update-packages` against a mocked `hey`. Each behaviour has a
negative control that must fail or must leave a line unchanged. It needs no Hey
checkout, so it can also run alone:

```sh
sh specs/commands_spec.sh
```

Its update-packages section also proves the refreshed lock names only paths
relative to the project (never an absolute path or the packager's scratch
directory) and that a lock which does is refused and restored.

`specs/registry_prune_spec.sh` tests `bin/registry-prune` on a fixture registry:
the closure keeps a version a current release pins (the negative control),
report-only writes nothing, `--out` is refused inside the registry, and an
unreadable archive refuses the prune.

Outside-in release test:

```sh
bin/package-zip
unzip -tq dist/hey_packager-0.1.13.zip
cat dist/hey_packager-0.1.13.release.json
cat dist/SHA256SUMS.txt
```

Use `bin/publish --no-commit --registry-root TMP/packages` for an isolated
publication test. Existing version directories must be rejected.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_packager-0.1.13.zip"
unzip -tq "dist/hey_packager-registry-publication-0.1.13.zip"
cat dist/SHA256SUMS.txt
```

The release metadata engine is compiled Hey, cached by source and compiler digest. The command regression suite runs with Python and pip absent from PATH; archive checks, immutable index updates, dependency planning, and import rewrites use that same engine.

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

Outside-in release test:

```sh
bin/package-zip
unzip -tq dist/hey_packager-0.1.9.zip
cat dist/hey_packager-0.1.9.release.json
cat dist/SHA256SUMS.txt
```

Use `bin/publish --no-commit --registry-root TMP/packages` for an isolated
publication test. Existing version directories must be rejected.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_packager-0.1.9.zip"
unzip -tq "dist/hey_packager-registry-publication-0.1.9.zip"
cat dist/SHA256SUMS.txt
```

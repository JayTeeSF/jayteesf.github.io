# Testing

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
bin/check
```

Outside-in release test:

```sh
bin/package-zip
unzip -tq dist/hey_packager-0.1.3.zip
cat dist/hey_packager-0.1.3.release.json
cat dist/SHA256SUMS.txt
```

Use `bin/publish --no-commit --registry-root TMP/packages` for an isolated
publication test. Existing version directories must be rejected.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_packager-0.1.3.zip"
unzip -tq "dist/hey_packager-registry-publication-0.1.3.zip"
cat dist/SHA256SUMS.txt
```

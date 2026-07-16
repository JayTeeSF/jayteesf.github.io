# Testing

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
bin/check
```

Outside-in release test:

```sh
bin/package-zip
unzip -tq dist/hey_packager-0.1.0.zip
cat dist/hey_packager-0.1.0.release.json
cat dist/SHA256SUMS.txt
```

Use `bin/publish --no-commit --registry-root TMP/packages` for an isolated
publication test. Existing version directories must be rejected.

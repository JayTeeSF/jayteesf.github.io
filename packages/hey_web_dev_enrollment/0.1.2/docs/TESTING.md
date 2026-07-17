# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

The package-specific portion is available directly as `bin/package-check`. The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_web_dev_enrollment-0.1.2.zip"
unzip -tq "dist/hey_web_dev_enrollment-registry-publication-0.1.2.zip"
cat dist/SHA256SUMS.txt
```

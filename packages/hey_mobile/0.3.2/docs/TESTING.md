# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

The package-specific portion is available directly as `bin/package-check`. The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

The specs include `specs/levels_spec.hey` (fitting to levels 1 and 2, spelling round trips, negative controls for each fault), `specs/values_spec.hey` (every vector in `conformance/values.json` against `values.hey`, with a control that a wrong expectation fails) and `specs/names_spec.hey` (`conformance/names.json` is exactly `icons.hey`).

A renderer proves itself by running `conformance/values.json` and `conformance/descriptions.json` against its own evaluator; `hey_ios` does it in its package check.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_mobile-0.3.2.zip"
unzip -tq "dist/hey_mobile-registry-publication-0.3.2.zip"
cat dist/SHA256SUMS.txt
```

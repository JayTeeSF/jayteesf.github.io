# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

The package-specific portion is available directly as `bin/package-check`. The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

`bin/package-check` runs `bin/conformance` (hey_mobile's vectors against the native evaluator on this Mac) and `bin/block-lifetimes`, which builds the host for the iOS Simulator with AddressSanitizer and runs the form's submit chain and the list's reorder chain against a stubbed request with `simctl spawn`. Each chain has a negative control: its fix reverted must stop with a heap-use-after-free. It boots an iPhone simulator when none is booted (`HEY_IOS_SIM_UDID` picks one) and shuts down any simulator it booted.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_ios-0.4.0.zip"
unzip -tq "dist/hey_ios-registry-publication-0.4.0.zip"
cat dist/SHA256SUMS.txt
```

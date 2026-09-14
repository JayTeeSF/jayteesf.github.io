# Testing

Run the complete package gate:

```sh
HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan" HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"   bin/check
```

`bin/package-check` installs the locked `hey_ios` if needed, runs `specs/carplay_audio_spec.hey` (the row shape check with positive and negative controls, and the frameworks `hey_ios` audio needs), holds `ios-extension.json` and `carplay.hey` together, and compiles `native/HeyIOSCarPlay.m` against the locked `hey_ios` headers for the iOS Simulator SDK when Xcode is present (`HEY_IOS_ROOT` points it at a `hey_ios` checkout instead). The outer `bin/check` also validates `hey-package.json`, `VERSION`, every declared file, required documentation, and the executable documentation example.

The scene itself is exercised by building an app with `--extension`: My Queue's `bin/ios-build` and `bin/check-ios` assert the Info.plist scene, the linked entitlement and the scene delegate symbol.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_carplay-0.1.3.zip"
unzip -tq "dist/hey_carplay-registry-publication-0.1.3.zip"
cat dist/SHA256SUMS.txt
```

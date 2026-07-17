# Testing and evidence

`bin/check` verifies the pure Hey modules, package manifest, shell syntax, and the command-line-tools regression that requires both `sdkmanager` and `avdmanager` to execute from the selected SDK itself, rather than Homebrew's separate SDK root.

The target script records:

- Hey Android doctor output;
- debug APK creation;
- device/emulator serial;
- installation and Activity launch receipts;
- generated `STATUS.md` and `receipt.json`;
- Logcat;
- Activity state;
- screenshot.

A debug APK/device launch is not Play publication evidence. Production signing,
AAB creation, Play Console validation, and store review remain separate gates.

## Release verification

```sh
bin/release
unzip -tq "dist/hey_android-0.1.4.zip"
unzip -tq "dist/hey_android-registry-publication-0.1.4.zip"
cat dist/SHA256SUMS.txt
```

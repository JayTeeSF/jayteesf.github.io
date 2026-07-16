# Testing and evidence

`bin/check` verifies the pure Hey modules and package manifest.

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

# hey_android

`hey_android` builds Hey programs that use the Hey runtime into signed Android
16 APKs with no Java or Kotlin. It also owns the toolchain doctor, the emulator
lane and the receipts that go with it.

The root `README.md` is the package overview and has the commands. This
directory is copied into every registry publication by `hey_packager`.

- `GETTING_STARTED.md`: from an empty Mac to a Hey program in logcat.
- `DESIGN.md`: how the lane is put together, and why.
- `TESTING.md`: what `bin/check` proves, and its negative controls.
- `ROADMAP.md`: phases 2 and 3, and what the Hey toolchain should provide.

## Release controls

```sh
bin/check
bin/release
bin/publish
bin/source-zip
```

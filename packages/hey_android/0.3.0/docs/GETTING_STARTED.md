# Getting started on macOS

## 1. The SDK pieces

Android Studio installs the SDK under `~/Library/Android/sdk`. Then:

```sh
cd "$HOME/dev/hey_android"
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
bin/android-doctor
```

**What the doctor checks:**
- platform 36, build-tools 36.0.0, NDK 28.2.13676358;
- platform-tools and the emulator;
- the API 36 Play system image;
- JDK 17 and the debug keystore;
- the Hey checkout, whose head, version and compiler identity it prints.

For each missing piece it prints the command that installs it, for example:

```sh
"$HOME/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$HOME/Library/Android/sdk" "ndk;28.2.13676358"
```

Run those lines, then run the doctor again until it says `android-doctor ok`.

## 2. The emulator

```sh
tools/hey-android-emulator.sh create-avd     # once
```

This creates `hey_android_API_36` ("hey_android API 36") from the Play image.
The app tool boots it headless when you pass `--emulator`, and shuts it down
when it is done.

To keep it running between builds:

```sh
tools/hey-android-emulator.sh boot           # prints serial=emulator-5584
# ... tools/hey-android-app.sh ... --device emulator-5584 --launch
tools/hey-android-emulator.sh shutdown emulator-5584
```

An emulator holds gigabytes of memory, so always shut it down.

## 3. A Hey program on Android

```sh
tools/hey-android-app.sh \
  --source examples/hello_runtime.hey \
  --out /tmp/hey-hello \
  --package-id com.jayteesf.hey.hello \
  --label 'Hey Hello' \
  --emulator hey_android_API_36 --launch

cat /tmp/hey-hello/stdout.txt       # what the program said, from logcat
cat /tmp/hey-hello/receipt.json
```

**The examples:**
- `examples/hello_runtime.hey`: maps, arrays, a string join, JSON and SHA-256.
- `examples/sha256_vectors.hey`: the NIST SHA-256 answers, as text and as
  files.
- `examples/platform_capabilities.hey`: what works on Android, and what reports
  itself unavailable.
- `examples/runtime_error.hey`: a Hey runtime error ending the activity
  cleanly.

**Your own program:**
- It needs a `program` block.
- It must build through `heyc build --emit-llvm-ir`; the README lists what that
  lane cannot lower yet.
- `says` output appears in logcat under `hey.out`.

## 4. Views and taps

```sh
tools/hey-android-app.sh \
  --source examples/rows.hey \
  --out /tmp/hey-rows \
  --package-id com.jayteesf.hey.rows \
  --label 'Hey rows' \
  --emulator hey_android_API_36 --launch --ui --keep-emulator

adb -s emulator-5584 shell input tap 540 700                  # somewhere on a row
adb -s emulator-5584 logcat -d -v tag -s 'hey.out:*' 'hey.ui:*'
tools/hey-android-emulator.sh shutdown emulator-5584           # always
```

- `examples/rows.hey` draws five rows and redraws with "Row N was tapped".
- `examples/rows_error.hey` fails on the first tap, to show the activity
  finishing cleanly.
- `--ui` waits for the first screen rather than the program's end.
- The shims log under `hey.ui`: each commit, and each tap with the row it hit.
- Try UI code on the Mac first: `specs/android_ui_host_spec.sh` shows how to
  run a program against `specs/support/fake_ui.c`. The LLVM lane miscompiles a
  few shapes silently (`docs/ROADMAP.md`, toolchain request 6).

## 5. Release signing

```sh
export HEY_ANDROID_KEYSTORE_PASSWORD='...'    # never on the command line
tools/hey-android-app.sh --source APP.hey --out DIR --package-id ID --label NAME \
  --keystore ~/keys/upload.jks --key-alias upload --version-code 2 --version-name 1.1
```

The APK is signed with v3. Creating the upload keystore and uploading to Play
are the Maintainer's steps.

## Release workflow for the package

```sh
bin/check
bin/release
unzip -tq dist/hey_android-0.3.0.zip
bin/publish
```

`bin/publish` refuses to overwrite a version. By default it publishes to
`$HOME/dev/jayteesf.github.io/packages`.

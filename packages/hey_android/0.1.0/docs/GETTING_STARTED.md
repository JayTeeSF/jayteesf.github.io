# Getting started on macOS

```sh
cd "$HOME/dev/hey_android"
./tooling/01-install-android-toolchain-macos.sh
./tooling/02-build-and-launch-hey-android.sh
```

Use a physical phone by setting its serial:

```sh
adb devices
ANDROID_SERIAL='DEVICE_SERIAL' ./tooling/02-build-and-launch-hey-android.sh
```

Override the Hey source or generated project directory:

```sh
HEY_ANDROID_SOURCE="$HOME/dev/my_app/app.hey" \
HEY_ANDROID_OUT="$HOME/Desktop/my-android-app" \
  ./tooling/02-build-and-launch-hey-android.sh
```

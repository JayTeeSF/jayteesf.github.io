# Getting started

```sh
hey android-tv-app \
  --out build/android-tv \
  --source app/tv.hey \
  --plan-only
```

For APK/device work, first install the generic Android toolchain through
`hey_android 0.1.4`, then run:

```sh
hey android-tv-app --out build/android-tv --source app/tv.hey --build --launch
```

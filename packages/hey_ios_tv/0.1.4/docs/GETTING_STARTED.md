# Getting started

After locking `hey_ios_tv` in an application project:

```sh
hey ios-tv-app \
  --out build/tvos \
  --source app/tv.hey \
  --plan-only
```

On macOS with Xcode and a booted Apple TV simulator:

```sh
hey ios-tv-app --out build/tvos --source app/tv.hey --launch
```

`--plan-only` proves the ordinary-Hey/tvOS object and app layout without
claiming simulator, signing, device, or App Store evidence.

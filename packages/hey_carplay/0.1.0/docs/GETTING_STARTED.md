# Getting started

Clone the package source under `$HOME/dev/hey_carplay`, then configure Hey and the shared packager:

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
export HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"
cd "$HOME/dev/hey_carplay"
bin/check
```

In an app, pin `hey_ios` 0.2.0 and `hey_carplay` 0.1.0 in `hey-package.json`, run `hey package ensure --project . --update-lock`, and pass the installed root to the build tool:

```sh
.hey/packages/hey_ios/0.2.0/tools/hey-ios-api-app.sh ... --extension .hey/packages/hey_carplay/0.1.0
```

A device build carries the CarPlay audio entitlement only after Apple grants it on the App ID; `HeyIOSCarPlayCapability.request_steps(bundle_id)` lists what to ask for.

## Release workflow

```sh
bin/check
bin/release
unzip -tq "dist/hey_carplay-0.1.0.zip"
bin/source-zip
bin/publish --no-commit
```

`bin/publish` refuses to overwrite an existing version and defaults to `$HOME/dev/jayteesf.github.io/packages`.

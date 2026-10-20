# Design

`hey_ios` keeps its public Hey modules and package-specific tests in this repository. Generic package validation, deterministic release construction, checksums, documentation publication, source ZIP creation, and immutable registry publication are delegated to `hey_packager`.

Package behavior remains independent of the release tool: `bin/package-check` exercises this package, while `bin/check` composes those tests with common manifest and documentation controls.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.

## Native host boundary (0.2.0)

`header.image_open_url` is an optional value binding evaluated against the screen JSON. An image with an absolute HTTP(S) destination and a host becomes an accessible link; missing images and invalid destinations create no link. The link wraps only the image and opens through `UIApplication openURL:options:completionHandler:`, matching `open_url` actions. It carries no product-specific URL construction or fallback.

- `hey_mobile/api_screens` is the description; `native/HeyIOSApiHost` executes it. Product knowledge (routes, copy, which services exist, what may be played) stays in the app and its server. `bin/package-check` fails if the host or the build tool names an extension's code.
- The Hey shell is literals only: the tool removes the program `main` from the IR and refuses a shell that calls the Hey runtime, so no runtime is linked into the app.
- Extensions are packages, not flags. `--extension DIR` reads `ios-extension.json` and only plain names (letters, digits, dot, dash, underscore) reach a plist or a command line. The host exposes three hooks for a scene it did not build: `HeyIOSApiHostLoadAudioFeed`, `HeyIOSApiHostAudioTitle` and `HeyIOSApiHostAudioFeedDidChange`. Non-window scene roles are configured from Info.plist.
- Simulator entitlements are linked into `__TEXT,__entitlements` and the ad-hoc signature carries none: the simulator refuses to spawn an ad-hoc signature carrying a restricted entitlement (measured on Xcode 26.5).

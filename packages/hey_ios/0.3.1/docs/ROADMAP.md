# Roadmap

## 0.1.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.1.3 — package compatibility

- Remove `hey_packager` from runtime dependencies.
- Depend on the repaired `hey_mobile >=0.1.3 <0.2.0`.
- Require `hey_packager >=0.1.3 <0.2.0` as external release tooling.

## 0.2.0 — native host for api_screens apps

- `native/HeyIOSApiHost`, `HeyIOSKeychain`, `HeyIOSAudio`, `HeyIOSShareController` and `tools/hey-ios-api-app.sh` (simulator and device builds, signing, share extension, icon).
- `--extension DIR` and the host's audio-feed hooks; CarPlay moves to `hey_carplay` 0.1.0.
- Depend on `hey_mobile` 0.2.0 (`api_screens`).
- Next: the LocalAuthentication half of the session adapter; an Android host for the same description.

## 0.3.0 — a level-2 renderer for served descriptions

- Depend on `hey_mobile` 0.3.0 (levels, conformance vectors).
- `native/HeyIOSValues`: the value language, kinds, neutral icon and file-kind names, and taking or refusing a served body; `bin/conformance` runs hey_mobile's vectors against it on a Mac.
- The host draws a stored or baked copy at once and revalidates the served one on launch and foreground; unknown kinds are hidden and never send a request; `when` and `=word` hold everywhere; the detail screen is gone.
- `api-renderer.json`; `fn ios_app_origin()` bakes the origin beside the description.
- Next: a `strings` block for the host's own words.

## 0.3.1 — signing in no longer crashes on a phone

- The form's submit chain and the list's reorder chain copy what they use before clearing the reference that keeps their running block alive.
- `bin/block-lifetimes`: both chains under AddressSanitizer on the iOS Simulator, with a negative control per chain.

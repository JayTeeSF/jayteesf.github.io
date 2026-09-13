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

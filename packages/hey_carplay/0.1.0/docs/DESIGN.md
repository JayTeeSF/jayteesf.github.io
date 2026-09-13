# Design

`hey_carplay` keeps its public Hey module, its native scene and package-specific tests in this repository. Generic package validation, deterministic release construction, checksums, documentation publication, source ZIP creation, and immutable registry publication are delegated to `hey_packager`.

## Boundary

- `hey_ios` owns the host, the audio module and the build tool. `hey_carplay` owns only the car scene and depends on `hey_ios` 0.2.0.
- The scene uses the host's public hooks and nothing else: `HeyIOSApiHostLoadAudioFeed` (the rows the Listen tab lists), `HeyIOSApiHostAudioTitle`, `HeyIOSApiHostAudioFeedDidChange`, and `HeyIOSAudio` to play.
- What may play is the app server's decision. The scene applies a shape check only (`HeyIOSAudioRowPlayable`): an http(s) audio address, or an Apple Music id for a subscriber.
- `ios-extension.json` is the contract `hey_ios`'s build tool reads (sources, framework, entitlement, scene). `carplay.hey` states the same contract in Hey; `bin/package-check` fails when they disagree.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication.

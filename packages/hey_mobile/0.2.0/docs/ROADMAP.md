# Roadmap

## 0.1.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.1.3 — package compatibility

- Remove `hey_packager` from runtime dependencies.
- Keep validation and immutable publication in external `hey_packager >=0.1.3 <0.2.0`.

## 0.2.0 — screens bound to JSON routes

- `api_screens.hey`: a platform-neutral app description (list, detail and form screens, sections, actions, menus, row actions, audio, share) bound to JSON HTTP routes.
- `problems` validates a description; `routes` lists every route it calls.
- First host: `hey_ios` 0.2.0 `native/HeyIOSApiHost`. Next: an Android host reading the same description.

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

## 0.3.0 — levels and served descriptions

- `levels.hey`: capability levels 1 and 2, `for_level` (removes what a level cannot draw, re-spells for it), `problems_for_level`, and the one-screen update description for a renderer older than a server supports.
- `icons.hey`: icon names and file kinds no platform owns, with the level-1 (Apple) spelling.
- `values.hey` and `conformance/`: the reference evaluator and the vectors every renderer passes (values, conditions, parameters, path encoding, known kinds, descriptions to take or refuse).
- `docs/RENDERERS.md`: hide what you do not know; served, stored and baked copies.
- Next: the Android renderer passes the same vectors; a `strings` block for the host's own words.

## 0.3.1 — package controls

- Adopts hey_packager (canonical bin/check, bin/bump, bin/release, bin/publish); release no longer publishes.

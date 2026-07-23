# Scene contract v2 — design (hey_tv 0.2.x / hey_ios_tv 0.2.x)

Status: accepted direction (maintainer directive 2026-07-23). Replaces
the v1 "opaque i64 + five functions" tvOS contract, whose
place-value state packing is an unacceptable developer experience.

## Principle

An app builds **scenes as ordinary Hey values** — objects and arrays,
the same data the language uses everywhere — and returns them as one
JSON document. The platform package renders the document. No packed
integers, no UI code in the app, no game logic in the package.

## The app-side contract (two functions)

```hey
fn tv_scene_init() -> Str          # initial scene document (JSON)
fn tv_scene_step(scene, event)     # current doc + event doc -> next doc
```

State IS the scene document (or a `state` field inside it): apps read
fields by name (`scene.game.sticks`), never by arithmetic. Events
arrive as documents too: `{kind: 'remote', button: 'select'}` today;
`{kind: 'tick'}`, `{kind: 'controller', player: 2, ...}` later — new
event kinds are additive, not breaking.

## The scene document (target-neutral; hey_tv owns the schema)

```json
{
  "schema": "hey-tv-scene-v2",
  "background": {"color": "#101820"},
  "sound": {"play": "chime"},
  "transition": {"style": "crossfade", "ms": 250},
  "widgets": [
    {"kind": "text",  "id": "title", "text": "Hey Demo TV",
     "style": "title", "color": "#FFFFFF", "align": "center"},
    {"kind": "qr",    "id": "join",  "payload": "https://.../join/DEMO",
     "caption": "Scan to join"},
    {"kind": "image", "id": "art",   "symbol": "gamecontroller.fill",
     "tint": "#4FD1C5"},
    {"kind": "text",  "id": "status","text": "Sticks left: 21 ...",
     "style": "headline"}
  ],
  "state": {"game": {"sticks": 21, "take": 1, "phase": "playing"}}
}
```

- **Widgets**: `text`, `image` (SF symbol name, bundled asset name, or
  data URI), `qr`, `rect`; positioned by declarative slots
  (`top/center/bottom` + order) first, exact frames later.
- **Templates**: named widget-list presets (`"template":
  "public-display"`) so a hello-screen app is ~10 lines; explicit
  widgets override template slots.
- **Sounds**: `sound.play` names a built-in cue set (package-shipped)
  or a bundled asset.
- **Transitions**: a hint (`none|crossfade|slide`), renderer-owned.
- Unknown fields are ignored (forward compatibility); unknown widget
  kinds render as a visible placeholder, never a crash.

## Renderer responsibilities (hey_ios_tv and siblings)

Parse document → diff against previous → update native views (UIKit
today; LEANBACK in hey_android_tv from the SAME documents — the
schema is the portability boundary). Remote presses become event
documents fed to `tv_scene_step`. The v1 game-contract symbols remain
supported through 0.2.x with a deprecation note, then drop.

## Runtime prerequisite (the real fix for the packing hack)

v1 shipped a no-runtime string shim, which is WHY app state had to
fit in an i64. v2 requires apps to build objects/arrays and encode
JSON, so hey_ios_tv 0.2.0 must link the real Hey runtime compiled for
the tvOS target instead of the shim. That work item (compile
runtime/hey_runtime.c for appletvsimulator/appletvos triples, link
when the object's receipt says runtime-required) is the first
implementation slice and also unlocks actors/collections in TV apps
generally.

## Testing story (unchanged philosophy)

Scene documents are strings: apps spec `tv_scene_step` transcripts
exactly as today (byte-compared JSON), and hey_tv ships a
`Television.validate_scene(doc)` used by both the spec harness and
the renderer (fail loudly at the boundary, not deep in UIKit).

## Implementation order

1. hey_tv 0.2.0: schema doc + `Television.scene/widget/validate_scene`
   builder-and-checker API (pure Hey, spec-tested).
2. hey_ios_tv 0.2.0: runtime-for-tvOS linking; JSON renderer for
   text/qr/image/rect + background + templates; event documents;
   v1 compatibility path.
3. hey_demo_tv_app: rewrite Nim on scenes (state as named fields —
   `scene.state.game.sticks`, no arithmetic), same spec discipline.
4. Sounds + transitions + slots-to-frames refinement; hey_android_tv
   renderer from the same schema.

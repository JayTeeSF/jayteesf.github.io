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

## The two contracts

`hey_ios_tv` builds either of two app contracts from ordinary Hey source.
The build script nm-checks the compiled app object and picks the renderer
automatically — no flag to set.

### Scene contract v2 (recommended)

A scene-v2 app exports two functions and returns scenes as JSON documents.
State is the document (read fields by name, never by arithmetic):

```hey
fn tv_scene_init()             # -> initial scene document (JSON string)
fn tv_scene_step(scene, event) # (current doc, event doc) -> next doc
```

When the app object exports `tv_scene_init`, the template is compiled with
the scene-v2 renderer (`-DHEY_SCENE_V2`). It parses the JSON with
`NSJSONSerialization` and draws:

- `background`: `{"color": "#101820"}` (flat) or `{"felt": "#1E4D3B"}`
  (vertical table gradient).
- `background_color` (top-level hex string, 0.4.7): a flat fill for the
  whole scene background that, when present and parseable, wins over the
  `background` object -- the one field a server-rendered scene needs to
  dim the screen at night. Absent (or unparseable) means exactly the
  0.4.6 behavior. See `SCENE_CONTRACT.md`.
- `text`: styles `title` / `headline` / `body` / `caption`, with `color`
  and `align`. Long text WRAPS: every label is capped at 1760pt (80pt
  margins on the 1920pt logical screen) rather than running off both
  edges (0.4.5). Inline markdown (0.4.8): `**bold**`, `*italic*` and
  `` `code` `` only, sized from the widget's own style. Underscore is NOT
  a marker, so cloze stems (`the ____ makes sugar`) and `snake_case`
  survive; a stray marker (`2 * 3 * 4`) stays literal; a string with no
  marker renders exactly as it did in 0.4.7. See `SCENE_CONTRACT.md`.
- `image`: an SF Symbol named by `symbol`, optional `tint`.
- `qr`: a `CIQRCodeGenerator` code for `payload`, optional `caption`, and
  optional `caption_color` (hex; 0.4.5) — the default caption color is
  near-white, which is invisible on a light background scene.
- `rect`: a filled rounded rectangle (`color`, optional `width`/`height`).
- The **card family** (renderer-owned geometry at 2.5:3.5 proportions,
  white faces with corner indices + a large center pip, hearts/diamonds
  red and spades/clubs near-black, soft drop shadows, deep-blue patterned
  backs for face-down cards):
  - `card`: one playing card (`rank`, `suit`, `face: "up"|"down"`).
  - `stack`: a pile, `fan: "down"|"right"|"none"` with `overlap`; an empty
    `cards` array renders a dashed outline slot.
  - `hand`: a horizontal card row with a `label` caption below.

Widgets stack vertically by declarative slot (`slot: "top"|"center"|
"bottom"`, default center) in list order. Unknown widget kinds render a
visible placeholder rather than crashing.

Remote presses become event documents
`{"kind":"remote","button":"select|up|down|left|right|playpause"}` fed to
`tv_scene_step`; the scene is re-rendered on each step. One
`{"kind":"seed","value":<epoch ms>}` event is delivered once at launch for
apps that seed a PRNG.

The Menu button is delivered as `{"kind":"remote","button":"back"}` **only
when** the currently installed scene declares top-level `"handles_back": true`
(0.4.6); otherwise Menu bubbles to tvOS and suspends the app, as the platform
requires at an app's root screen. The declaration is re-read on every scene
install; scenes without the field behave byte-identically to 0.4.5. See
`SCENE_CONTRACT.md`.

A worked app lives in `examples/native_tvos_scene_app.hey` — a blackjack
table (felt, a dealer hand of three face-up cards, a face-down hole card,
and a QR join code) whose Select press flips the hole card. Its embedded
spec block pins the exact init/step documents.

### v1 game contract (supported through 0.2.x)

Apps that export the opaque-i64 game contract (`tvos_app_manifest`,
`tvos_action_code`, `tvos_game_init/step/text`) keep working unchanged;
the template compiles the v1 public-display path. See
`examples/native_tvos_app.hey`.

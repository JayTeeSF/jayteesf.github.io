# Scene contract (tvOS renderer)

`hey_tv` owns the target-neutral scene document. This file documents the parts
the **tvOS renderer** owns: the live-data declarations (`tick`, `fetch`), the
`data` event they produce, the back-button declaration (`handles_back`), and
the bootstrap fallback that keeps a display recoverable. The widget vocabulary
is in `GETTING_STARTED.md`.

An app exports two functions:

```hey
fn tv_scene_init()             # -> initial scene document (JSON string)
fn tv_scene_step(scene, event) # (current doc, event doc) -> next doc
```

## Live data

A scene opts into the renderer's clock and socket by carrying either key:

```json
{
  "tick":  {"ms": 1000},
  "fetch": {"id": "room", "url": "https://host/tv/rooms/ABCD", "ms": 2000, "mode": "scene"}
}
```

- The timer period is `tick.ms`, else `fetch.ms`, else `2000`, floored at
  `250`. One repeating timer serves both.
- `tick` delivers `{"kind":"tick","ms":<epoch ms>}` to `tv_scene_step`.
- `fetch` issues one GET per period. Requests never stack: while one is in
  flight the next period is skipped.
- `fetch.mode == "scene"`: the fetched body **is** the next scene and the
  renderer installs it directly. This is what lets a display project
  server-rendered state without the Hey app parsing JSON (the tvOS LLVM subset
  builds documents by string concatenation and cannot decode them).
- Any other `fetch.mode`: the result arrives through the normal event funnel as
  `{"kind":"data","id":<fetch.id>,"status":<http status>,"body":<string>}`.
  A transport failure reports `"status": 0`.

Networking is `NSURLSession` inside the renderer, never `stdlib:Http` from Hey:
`tools/hey_tvos_link_stubs.c` replaces the whole OpenSSL surface with `abort()`
traps, so an HTTPS request issued from Hey on tvOS terminates the app.

Only a `200` response with a non-empty body may replace the scene. A failed
poll leaves whatever is on screen untouched.

## The back button (`handles_back`, 0.4.6)

On tvOS the Menu button belongs to the **system** by default: at an app's root
screen, Menu suspends the app and returns to the tvOS home screen. That is the
platform convention and an App Store requirement — a renderer that swallowed
every Menu press would make apps inescapable (this actually happened on
hardware: before 0.4.6 the mapping table had no Menu case, so the `back`
button existed in specs but no physical press ever produced it).

A scene claims the press by declaring, at the top level of the document:

```json
{"handles_back": true}
```

- While the **currently installed** scene declares `"handles_back": true`,
  a Menu press-down is delivered through the normal event funnel as
  `{"kind":"remote","button":"back"}` and is **not** forwarded to the system.
- When the field is absent, `false`, or not a boolean, Menu is forwarded to
  the responder chain exactly as before, so tvOS suspends the app. Absent
  means false.
- The flag is **re-evaluated on every scene install** — the initial
  `tv_scene_init` document, every `tv_scene_step` result, every `"scene"`-mode
  poll install, and the bootstrap-fallback re-install. Scenes change every
  poll, so a server can declare `handles_back` on an inner screen (question,
  settings, results) and drop it on the root/lobby screen, which restores the
  Menu-suspends-at-root behavior reviewers expect.
- The decision for one physical press is captured at press-down and reused for
  the matching press-up, so a poll that swaps the scene mid-press can never
  split a single press between the funnel and the system.
- One `NSLog` line (`handles_back=...`) is emitted whenever the value changes.

**Compatibility: this field is purely additive.** Every existing scene — any
document with no `handles_back` field — behaves **byte-identically to 0.4.5**:
Menu bubbles to tvOS and every other button maps exactly as before.

## The scene background (`background_color`, 0.4.7)

A scene has always been able to declare a background through the
`background` object (`{"color": "#FAFAFA"}` flat, `{"felt": "#1E4D3B"}`
gradient). 0.4.7 adds a **top-level** sibling:

```json
{"background_color": "#101820"}
```

- A hex string in the same format as every other scene color field
  (`#RRGGBB` or `#AARRGGBB`; the alpha prefix is ignored, as in
  `HeyColorFromHex`).
- When present and parseable, the renderer fills the scene background flat
  with it, and it **wins over** the `background` object's `felt`/`color`.
  That precedence is the point: it is a single field a server-rendered
  night palette can add to dim the whole screen (maintainer report,
  2026-07-31: the white quiz screen is too bright at night) without
  restating or restructuring the scene's existing background declaration.
- When the field is **absent, not a string, or not a parseable hex value**,
  the background path is exactly the pre-0.4.7 one: `background.felt`,
  else `background.color`, else the renderer's dark default. Absent means
  today's behavior.

**Compatibility: this field is purely additive.** Every existing scene --
any document with no `background_color` field -- renders
**pixel-identically to 0.4.6**. The guard is the same pattern as
`caption_color` (`isKindOfClass` string check, shared hex parser with a
fallback) and the same absent-means-unchanged rule as `handles_back` and
`keep_awake`.

Widget ink was checked for a sibling field and deliberately **not** given
one: the `text` widget's default ink is white (light-on-dark) and every
widget already takes a per-widget `color` / `caption_color` / `tint`, so a
dark palette needs no new ink field -- the server already owns every ink
it emits.

## Inline markdown in `text` widgets (0.4.8)

A `text` widget's string may carry three inline markers, and no others:

| Written | Renders |
| --- | --- |
| `**powerhouse**` | **bold** run |
| `*powerhouse*` | *italic* run |
| `` `atp_synthase()` `` | monospaced run |

There is no block syntax: no headings (the widget `style` already is the
heading vocabulary), no lists, no links, no images. A screen nobody touches
has no use for a link, and the only formatting worth having on a wall is the
kind that survives being read from the back of the room — emphasis on the
word that carries the question, and a monospace run for a term or formula
that must be read literally.

**Underscore is not a marker.** `_italic_` renders as `_italic_`, with the
underscores visible. This is deliberate and load-bearing: fill-in-the-blank
stems are written as runs of underscores (`Plant cells use the ____ to turn
sunlight into sugar`), and treating `_` as emphasis would mangle every cloze
question on the wall. `snake_case` identifiers survive for the same reason.

Bold and italic runs derive their font from the **label's own** font
descriptor at the label's own point size, so a bold run inside a `title` is a
bold 76pt title, not a hardcoded body size. A code run is the monospaced
system font at that same point size. Colour is unchanged throughout — the
widget's `color` still owns the ink.

A marker only **opens** an emphasis span when the next character is not
whitespace, and only **closes** one when the preceding character is not
whitespace. This is what keeps arithmetic readable: `2 * 3 * 4 equals 24`
renders with its asterisks intact rather than as `2  3  4` with an italic 3.
An unmatched or stray marker — `*unclosed`, `see note *`, `* not a list` —
is emitted **literally** and never swallows the rest of the line.

A backslash escapes a marker or another backslash: `\*star\*` renders as
`*star*`. It escapes **nothing else**, so a backslash in ordinary text is
emitted as itself and `C:\Users` and `\alpha` keep every character.

**Compatibility: this is purely additive.** A string containing none of
`*`, `` ` `` or `\` never enters the parser at all and keeps the plain
label path it has always used, so every pack already in the field and every
scene a server renders today is **byte-identical to 0.4.7**.

## Re-arming, and the bootstrap fallback

Because a fetched scene carries its own `fetch` declaration, a `"scene"` poll
can move the renderer onto a **different** url. That is the Jackbox-style room
handoff: an Apple TV pack bakes ONE generic bootstrap url
(`https://host/tv/displays/new`), the server answers with a scene whose
`fetch.url` is room-specific, and the renderer follows it.

The hazard is that the move is one-way. If that room later goes away — session
expiry, server restart, deploy — every poll fails, nothing is ever installed,
and the screen sits on its last frame forever. The server cannot fix it,
because the TV is no longer asking the server anything it can answer.

So the renderer keeps a way home:

- **The baked url is remembered.** The `fetch.url` present in the very first
  scene, the one returned by `tv_scene_init`, is captured at launch and kept
  separately from the url the poll is currently armed on.
- **Consecutive scene-poll failures are counted.** A failure is anything that
  did not produce an installable document: transport error, timeout, non-2xx
  status, or an empty body. The count resets to zero on every successful
  install.
- **At 5 consecutive failures the poll returns to the baked url.** Only
  `fetch.url` is rewritten; the widgets on screen are left alone, so the
  display keeps showing its last good frame until the bootstrap url answers.
  The counter resets, giving the bootstrap url a full budget of its own.
- **No thrash.** If the poll is already on the baked url, it simply keeps
  retrying it on the normal cadence. There is no back-off: the cadence is
  already the app's declared `fetch.ms` and requests never stack.
- **Scene mode only.** In any other mode the Hey app owns the scene and already
  sees the failure as a `data` event, so the renderer does not overrule it.
- One `NSLog` line is emitted when the fallback fires, naming the abandoned url
  and the bootstrap url it returned to.

At the default 2000ms cadence, 5 failures is roughly ten seconds of a dead
screen before recovery is attempted: long enough that one Wi-Fi hiccup or a
single slow response does not throw away a healthy room, short enough that
nobody has time to walk over and restart the app. The threshold is a count, not
a duration (`kHeySceneFetchFailureLimit` in
`tools/hey_native_tv_runtime.m`), so a slower poll waits proportionally longer.

### What this does not cover

The renderer uses `NSURLSession.sharedSession` with its default request
timeout. A server that accepts a connection and then hangs is therefore counted
as one failure only after that default timeout elapses, which is much longer
than a typical poll period. Servers that are down, unreachable, or answering
4xx/5xx fail fast and recover on the schedule above.

## Compatibility

The fallback is purely additive. A pack whose polls always succeed never
increments the counter and behaves exactly as before; a pack that bakes no
`fetch.url` into its first scene has no bootstrap url and is left alone.

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

## Keeping the screen awake (`keep_awake`, 0.4.3)

The tvOS screensaver is a bug during a live quiz: the whole room is looking at
the screen, nobody is touching a remote, and tvOS has no idea the display is
doing anything. A scene asks to stay awake by declaring, at the top level:

```json
{"keep_awake": true}
```

- While the **currently installed** scene declares `"keep_awake": true`, the
  renderer disables the system idle timer (`UIApplication.idleTimerDisabled`)
  and no screensaver starts.
- When the field is absent, `false`, or not a boolean, the idle timer is live
  and tvOS behaves normally. **Absent means false**, so every scene written
  before 0.4.3 behaves exactly as it did.
- Re-evaluated on **every scene install**, like `handles_back`.
- One `NSLog` line is emitted whenever the *applied* value changes. It reports
  what was applied and both of the facts it was computed from — the scene's
  declaration and whether video is playing — not just the declaration.

**Scene-declared rather than always-on, deliberately.** A display parked on an
unclaimed code could sit for hours, and holding the screen awake forever wastes
power and risks burn-in for no one's benefit. The server knows which it is: a
claimed room keeps the television awake, an unclaimed one lets it sleep.

**A playing film overrides the declaration.** The value actually applied is
`declared || video is playing`, so a scene declaring `keep_awake: false` still
holds the screen awake for as long as a `video` is playing, and goes back to
its declared value the moment playback stops — dismissed, finished, or the
scene stopping carrying `video`. Without this the screensaver comes up **over a
playing film**: tvOS "Start After" can be set to as little as two minutes, and
a reel usually runs longer than that.

**That override is the renderer's job, not something a server should be asked
for.** The screen carrying an attract reel is the idle, unclaimed one, and the
server emits that identical scene whether or not a film is playing — it has no
way to say "awake for the next two minutes". A server that sent
`keep_awake: true` alongside the video would therefore hold the television
awake for as long as the display stayed idle, which is exactly the burn-in and
power reasoning that put `false` there in the first place. The renderer is the
only side that knows a film is *actually playing*. It is recomputed from both
facts on every install rather than latched, so the poll that lands two seconds
into a film cannot clobber it.

**Compatibility: this field is purely additive.** A document with no
`keep_awake` field leaves the idle timer alone, and a document that never
carries `video` is governed by its declaration and nothing else.

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

## Sound (`sound`, 0.4.9)

A top-level object naming one cue from a closed palette:

```json
{"sound": {"cue": "think", "volume": 0.35}}
```

| cue | shape | intended moment |
|---|---|---|
| `think` | **loops** | a question is open and the room is working |
| `reveal` | once | the answer is being shown |
| `join` | once | a player joined |
| `celebrate` | once | the finished scene |
| `silence` | — | stop whatever is playing |

`volume` is `0.0`–`1.0`, default `0.6`, clamped. (The default was `0.35` when
this section was written; 0.4.9 raised it to `0.6` after the cue peaks were
measured, and this line had not followed.)

**Absent means silence, not "unchanged."** Every pre-0.4.9 scene declares no
`sound` and therefore plays none, so it behaves byte-identically to 0.4.8. It
is also the only reading that cannot get stuck: were absence to mean "carry
on", a server that stopped emitting the field could never silence the TV again.

**The same cue on consecutive scenes does not restart it.** A `"scene"` poll
re-installs the document every couple of seconds; playback changes only when
the resolved cue *name* differs from the one already sounding, so a looping bed
plays continuously across polls instead of retriggering ~30 times a minute.
An unknown cue name is treated as silence and logged, the same way an unknown
widget kind renders a placeholder rather than trapping.

**The cues are synthesised, never shipped as audio.** They are built from sine
partials with a struck-mallet envelope at render time. This is a licensing
requirement first and a size win second: a recognisable game-show bed is
somebody's recording, and embedding one would put a licence on every app that
consumes this package. It also keeps the exported pack a pure code artifact —
no asset bundle, no loader, no path resolution on the device.

**There is deliberately no tick, clock, countdown, metronome or buzzer cue.**
`think` is a four-note figure on a major pentatonic scale, which contains no
semitone and no tritone and therefore cannot build tension however long it
loops. A metronome is a deadline you can hear, and it penalises exactly the
people who are already anxious. `specs/sound_and_graphics_spec.sh` fails if
such a cue is added.

The audio session is **Ambient**: cues mix with whatever is already playing and
never seize the audio route. If the engine fails to start, the failure is
logged and the app continues silently — audio is a garnish, and a quiz that
refused to run because a chime failed would be the worse bug.

## Real images (`image.url`, 0.4.9)

The `image` widget gained `url`, `width` and `height` alongside `symbol`:

```json
{"kind": "image", "url": "https://host/logo.png", "width": 420, "height": 160,
 "symbol": "photo"}
```

- `url` is fetched once and cached by url; `symbol` still renders exactly as in
  0.4.8 and shows as the **placeholder** while the download is in flight, so a
  slow or dead url degrades to an icon rather than a hole.
- `width`/`height` default to `140` — the value hardcoded through 0.4.8 — so
  existing scenes are unmoved.
- A widget with no `url` takes no new code path at all.

**The cache is load-bearing, not an optimisation.** Every widget view is rebuilt
on every poll, so a download slower than one poll period completes onto a view
that has already been discarded, and the replacement starts the download again
— forever, showing nothing. Caching by url is what lets the *second* render
display the image synchronously. The image view is held weakly by the
completion handler, so a late arrival for a replaced view is dropped.

## Bundled audio (`sound.file`, 0.4.10)

The synthesised palette is a closed set of short cues; scored music is not
something a note table can produce. The `sound` object gained a sibling to
`cue` for audio that ships **inside the app**:

```json
{"sound": {"file": "anthem.m4a", "loop": true, "volume": 0.6}}
```

- `file` is a **bundle resource name with its extension** — `anthem.m4a`,
  `question-to-answer.m4a` — and **never a path**. A name containing `/` or
  `..` is refused and logged.
- That rule is a security boundary, not a convenience. The value arrives inside
  a scene document fetched over the network, and a renderer that treated it as
  a path would let whoever answers that url name an arbitrary location on the
  device. Resolution is `-[NSBundle pathForResource:ofType:]` against a **flat**
  bundle, so a subdirectory would simply never be found.
- **`file` wins over `cue`** when a `sound` object carries both.
- `loop` defaults to **`false`** for a file. Unlike the closed palette — where
  whether a cue repeats is a property of the cue *name* — whether a recording
  should repeat is a property of the recording, so the scene states it.
- `volume` is `0.0`–`1.0`, default `0.6`, clamped: the same field the cue path
  uses.
- **The same file on consecutive scenes does not restart it.** Playback is
  keyed on a resolved identity — `file:<name>` for a bundled file, the cue name
  otherwise — so a bundled bed plays continuously across polls for exactly the
  reason a looping cue does.
- A file that is **not in the bundle, or cannot be decoded**, is logged and
  treated as silence. Audio is a garnish; a missing asset must never be a
  crash or a stuck screen.
- The file is decoded into the audio player's own format (44.1kHz stereo) on
  read, so a 48kHz recording plays at the right speed rather than fast.

**Getting a file into the bundle** is a build-time step, not a scene one: point
`HEY_IOS_TV_ASSETS` at a directory when running `hey ios-tv-app`, and every
file in it is copied flat into the `.app` before signing. An assets directory
that contributes nothing fails the build rather than shipping a television
whose sound never plays.

**Which toggle mutes it:** `sound.file` is the **Soundtrack** in the
per-television sound menu below; `sound.cue` is **Sound effects**. They are
independent.

**Compatibility: this field is purely additive.** A `sound` object with no
`file` takes the cue path exactly as in 0.4.9, and a scene with no `sound`
object at all is silent as before.

## The attract reel (`video`, 0.4.13)

A display nobody is using can play a film full-bleed with sound instead of
showing a code to an empty room. A scene declares, at the top level:

```json
{"video": {"file": "attract-reel.mp4", "loop": false, "volume": 0.2}}
{"video": {"url": "https://host/reel.mp4", "loop": true, "volume": 0.2}}
```

- `file` names a **bundled** resource, resolved by exactly the rule
  `sound.file` uses above — a name with its extension, never a path — and
  shipped by the same `HEY_IOS_TV_ASSETS` mechanism.
- `url` names a **remote** film.
- **`file` wins when both are present**, because the bundled one is the one
  guaranteed to be there.
- **Absent means stop.** A scene carrying neither `file` nor `url` tears the
  player and its layer down, so a server that stops emitting the field can
  always turn the film off. Every scene written before 0.4.13 carries no
  `video` key and renders exactly as it did.
- **`loop` defaults to `true`.** A film that should play **once must send
  `"loop": false` explicitly.** With `false` the renderer tears the player and
  its layer down at the end of the item; without that teardown the last frame
  would sit on screen over the waiting scene until someone restarted the app.
- `volume` is `0.0`–`1.0`, default `0.2`, clamped. Low on purpose: this starts
  by itself in a room where nobody asked for it, so it must not be the loudest
  thing in there.
- The film is drawn above the scene, aspect-fit. The scene underneath is not
  disturbed and is exactly as it was when playback stops.

Three behaviours follow from the fact that a `"scene"`-mode poll re-installs
the same document every couple of seconds, and a caller who does not expect
them will be surprised:

- **It is idempotent by resolved key** — `file:<name>` for a bundled reel, the
  url otherwise. Re-emitting the same film does not restart it, which at a 2s
  cadence would otherwise mean starting it about thirty times a minute.
- **Any remote press dismisses the film, and that press is swallowed** — it
  does not also reach the scene. Someone walking up to a playing screen is
  stopping it, not choosing whatever the screen underneath had focused.
- **A key that was dismissed, that finished, or that could not be resolved is
  suppressed** until the key changes or `video` goes away. All three need it
  for the same reason: the server goes on emitting the identical scene until it
  notices something changed, so without suppression the next poll would start
  the film again two seconds later, and the remote would appear dead.

Two interactions with the rest of the contract:

- **The screensaver cannot come up over a playing film** — see `keep_awake`
  above. A scene declaring `keep_awake: false` still holds the screen awake for
  the film's duration.
- **`volume` is what the per-television mute restores.** A television whose
  Soundtrack toggle is off plays the film silently, and unmuting returns it to
  the `volume` the scene asked for — never to full volume.

**Compatibility: this field is purely additive.** A document with no `video`
key takes no new code path, and the audio, widget and background behaviour of
every existing scene is unchanged.

## The sound settings menu (`allow_settings`, 0.4.13)

A television can be told to stop making noise, from the remote in the room it
is in. **Up** opens a renderer-drawn overlay with two independent toggles —
**Soundtrack** (`sound.file` playback, and the attract reel's audio) and
**Sound effects** (the synthesised `sound.cue` palette) — navigated with
Up/Down, toggled with Select, closed with Menu or Play/Pause.

A scene invites that binding by declaring, at the top level:

```json
{"allow_settings": true}
```

- While the **currently installed** scene declares `"allow_settings": true`, an
  Up press (or clickpad swipe up) opens the menu and is **not** also delivered
  to the scene as `{"kind":"remote","button":"up"}`. One press, one meaning.
- When the field is absent, `false`, or not a boolean, Up reaches the scene
  exactly as before. **Absent means false**, so every scene written before
  0.4.13 keeps its own Up.
- Re-evaluated on **every scene install**, like `handles_back`, so a server can
  offer the menu on a waiting screen and withdraw it on the next one.
- While the overlay is open it owns the remote: no press reaches the scene
  underneath, and the scene is untouched when it closes.
- One `NSLog` line (`allow_settings=...`) is emitted whenever the value changes.

**Declare it on PRE-QUIZ SCREENS ONLY — never on a scene with a live question
on it.** On a server-rendered scene every button is inert by design: that is
what stops a classroom display from being clobbered by someone leaning on a
remote, and it is why this is an opt-in marker rather than a global binding.
The screens it is meant for are the ones where nothing is at stake and the
noise is happening anyway — a boot splash, a waiting/unclaimed-code screen, a
lobby. A question screen that declared it would be trading that protection for
a menu nobody needs mid-question.

**The mute itself is not part of this contract.** It is a property of one
television in one room: the renderer stores it in `NSUserDefaults` and the
server is never told. Server-held state would either follow every display on
the account or need per-display storage that does not exist. Both toggles
default to **on** (audible), and the stored fact is "muted" rather than
"enabled" precisely so that a television which has never opened the menu — or
whose defaults were wiped — reads as audible.

**Compatibility: this field is purely additive.** A pack that never emits it
has no settings entry at all, exactly as a pack that never emits `allow_demo`
has no demo, and every scene behaves byte-identically to 0.4.12.

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

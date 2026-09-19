# Renderers

What a native renderer of a `hey_mobile` description must do, so that one
server can send the same screens to renderers on different platforms and of
different ages. `hey_ios` 0.3.0 (`native/HeyIOSApiHost`, `native/HeyIOSValues`)
is the first renderer that keeps this contract; an Android renderer reads the
same description.

## Levels

A renderer declares one number: the highest level of this contract it draws.

| level | what it is |
|---|---|
| 1 | What `hey_ios` 0.2.0 draws. Icons are SF Symbol names (`system_image`, `symbol`, `symbols`, `symbol_by`); a document picker names Apple type identifiers (`types`); a form's `missing` text puts the label at `%@`. Screen types `list`, `form`, `search`, `audio`, `detail`. |
| 2 | The same vocabulary, spelled for any platform: icon names from `icons.hey` (`icon`, `icons`, `icon_by`); file kinds `csv`, `json`, `text` (`accept`); `missing` says `{label}`. No `detail` screen. The renderer keeps every rule below. |
| 3 | Level 2, plus choosing several (action kind `choose_many`) and offers (a form lookup's `offers`). Vectors: `conformance/level3.json`. |

`HeyMobileLevels.registry(level)` lists each level's screen types, section,
action, field and row kinds, value modifiers, and whether lookups may offer
(`offers`).

## Level 3: choosing several, and offers

**`choose_many`** is an action with the same `choices` (a route: `method`,
`path`, `list`, `value`, `label`, `where`) or literal `options` (`title`,
`value`) as `choose`, and the same `title`, `prompt_text`, `empty`, `prompt`,
`confirm`, `request`, `done` and `failed_title`. The renderer lists the options
with a tick beside each; a tap ticks or unticks; **Done** is enabled once one
is ticked, and Cancel sends nothing. What follows reads two variables,
`HeyMobileValues.chosen(options, picked)`: `values`, the ticked values in the
order of the options, each once (a request body sends `$values` as a list),
and `value_titles`, their titles joined by `, ` (for `done`, say
`Sent to {value_titles}`). A server that takes a list names it in its route.

**`offers`** sits on a form's `lookup`, beside `fills`:
`offers: {fields: {<field id>: <path in the lookup's answer>}, text: 'Found: {value}'}`.
`fills` put what the lookup found into fields nobody typed in. `offers` are for
the fields somebody did type in: after each answer the renderer asks
`HeyMobileValues.offers(lookup, answer, fields, values, touched)` and shows each
offer under its field as one control saying `text` with `{value}` as the
offer's title. A tap sets the field to the offer's value, counts the field as
not typed in, and the offer goes. An offer is made only when the field was typed
in, holds text, and the found text differs (both trimmed); a choice field is
offered only a value one of its options has, under that option's title.

Below level 3, `for_level` removes every `choose_many` (an app writes
`min_level: 3` and an `instead` holding today's `choose`, so an older renderer
keeps its single choice) and removes `offers` from every lookup, so an older
renderer's fills work as before. `problems_for_level` names either one left in
an answer below level 3.

## Fitting a description to a level

`HeyMobileLevels.for_level(app, platform, level)` is the only thing a server
does to a description before sending it:

1. An element carrying `min_level` above the level is removed, or replaced by
   its `instead`. Both keys leave the answer.
2. Every screen, section, action, field and row whose kind the level lacks is
   removed; a tab or web link naming a removed screen goes with it.
3. The answer is spelled for the level (icons, file kinds, `missing`).
4. The answer starts `{"schema": ..., "level": N, "platform": ...}`. A level
   above `current()` is answered at `current()`.

`problems_for_level(answer, level)` names anything left that the level cannot
draw. `update_description(platform, title, heading, message)` is the one-screen
answer, drawable at level 1, for a renderer older than the server supports.

## Refusing a description

A served description is taken only when all of these hold (conformance vectors:
`conformance/descriptions.json`):

- the body is at most `max_bytes` (2,000,000) and parses as a JSON object;
- when the ETag header holds a SHA-256 (`"<hex>"` or `W/"<hex>"`), it is the
  SHA-256 of the body;
- `schema` is `hey-mobile-api-app-v1`, `level` is a whole number from 1 to the
  renderer's own, and `platform` is the renderer's platform;
- `screens` is a list of objects each with a text `id` and `type`;
- at least one tab names a screen the renderer draws, every tab names a screen,
  and `session.sign_in_screen` names a screen.

A refused description changes nothing: the renderer keeps the copy it has.

## Hide what you do not know

- An unknown screen type is not drawn: its tab is left out and nothing opens it.
- An unknown section kind (an explicit `kind`), action kind, form field kind or
  literal row kind is not drawn. An action whose `then_action` is unknown is
  not drawn either.
- **A renderer never sends a request for an action it does not recognise.** An
  action with no `kind` (or `kind: "request"`) sends its request; nothing else
  falls back to sending.
- An unknown value modifier empties its placeholder, so the template is hidden.
- An unknown icon name draws the renderer's default glyph.
- Unknown keys are ignored.

## Values

`values.hey` is the reference evaluator and `conformance/values.json` the vectors:
paths, templates and their modifiers, lines, literal text, conditions (`when`),
truth, request body values (`$name`, `@name`, `?`), parameters (`=word`,
`$name`, a path read from the row and then the screen's answer), percent-encoded
path variables, and which kinds a level knows. `when` applies wherever an
element may carry it, route sections included; `=word` works wherever a
parameter is read. A renderer passes when every answer equals `expect`.

`conformance/names.json` is the icon and file-kind table with the SF Symbol and
Apple type identifiers `hey_ios` draws; another platform maps the same names.

## Served, stored, baked

A description may name the route that serves it: `served: {method: "GET", path}`.
The renderer asks `path?platform=<platform>&level=<level>` with no credentials,
sending `If-None-Match` with the ETag of the copy it holds (the SHA-256 of that
copy's bytes, so a fresh install asking with its baked copy is answered 304 when
nothing changed). The server answers 200 with `ETag` and
`Cache-Control: no-cache`, or 304.

- On launch the renderer draws the stored last-good copy when it is valid for
  this build, else the baked copy. It never waits on the network to draw.
- On launch and on return to the foreground it asks again. A new valid copy is
  stored, then drawn as soon as nothing is in progress (no pushed screen, no
  sheet, no half-typed form); otherwise at the next opportunity.
- A network failure, an error status, or a refused body changes nothing.
- These always come from the baked copy, whatever is served: the server origin,
  the secure-store name (`keychain_service`), `url_scheme`, `session.header`,
  `session.prefix`, `session.check`, `session.sign_out`, and `served` itself. A
  served description can change screens; it cannot send the session anywhere
  else.
- A stored copy belongs to the build that stored it: a new build with a new
  baked copy starts from its own.

## Audio on the app's own server

A renderer sends no request header with an audio fetch: no session, no bearer
token. An address a server protects is exchanged first. When the description's
`audio` carries `sign: {method, path, body}` (the body reads `$url`), the
renderer sends that route with the session for each audio address on the app's
own origin, just before that page plays, and plays the `url` of the answer, an
address on the same origin that authorises itself and lasts minutes. When a
playing page fails it is exchanged once more and resumed where it stopped (the
address may have run out during a pause). An answer that is an error, or whose
`url` is on another origin, is not played. Without `sign`, every address plays
as it is. Addresses on other hosts are never sent to `sign`.

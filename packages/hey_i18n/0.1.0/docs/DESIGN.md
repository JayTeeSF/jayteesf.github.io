# Design

`hey_i18n` owns pure, reusable internationalization primitives for Hey
applications: fallback chains, catalog lookup, single-pass interpolation,
CLDR-shaped plural categories, whole-page-body token substitution, and
catalog-aware Accept-Language negotiation.

## Origin

This package is the extraction of a working prototype built inside the
RecallCoach application (`domain/i18n.hey` + `specs/i18n_spec.hey` there,
with a full design record in that repository at
`docs/agents/research/hey-i18n-package-design.md`). The prototype was
deliberately written against no application-specific shape so it could be
promoted verbatim; the one behavioural addition made at extraction time is
the smarter `locale_for_request` described below.

## Why the API is pure functions: Hey has no mutable global store

Most i18n libraries in other languages have a `registerLocale()` call that
mutates a hidden global registry. That shape is not available in Hey:
handlers are resolved by function name and take exactly one request
argument, so they cannot close over state read at boot, and there is no
mutable module/global store to stash a registry in. So "registering a
locale" cannot be a runtime side effect. It has to be building a plain
RECORD and passing it as a normal argument. Every public function is pure,
taking a **catalog** (a record), a **fallback chain** (an array of locale
codes), and a **key**, and returning a string. There is no hidden state to
get out of sync, no boot-order dependency, and every function is trivially
testable with a literal record — which is exactly how `specs/i18n_spec.hey`
exercises it.

## Public API

```hey
module I18n
  # Fallback chain: chain('es-MX', 'en') -> ['es-MX', 'es', 'en']
  fn chain(locale, default_locale)

  # First non-nil catalog[loc][key] walking the chain, else nil.
  fn lookup(catalog, chain, key)

  # Same as lookup, but a totally missing key renders as '???key???'
  # (visible-missing) instead of nil or a blank.
  fn t(catalog, chain, key)

  # Single-pass '{name}' interpolation over a values record.
  fn render(template, values)

  fn format(catalog, chain, key, values)   # = render(t(...), values)

  # Whole-page-BODY token substitution: scans `body` once for
  # 'open...close' tokens (e.g. '@@key@@') and resolves each through the
  # SAME catalog/chain used for server copy.
  fn render_body(body, catalog, chain, open, close)

  # CLDR-shaped plural category for `n` in `locale`.
  fn plural_category(locale, n)

  fn plural_lookup(plural_catalog, chain, key, n)
  fn plural(plural_catalog, chain, key, n, values)

  # Catalog-aware Accept-Language negotiation (see below).
  fn locale_for_request(request, catalog, default_locale)
end
```

### Catalog shape

A catalog is `{locale_code: {key: template_string, ...}, ...}`. The
default language is just another locale in the catalog, looked up like any
other — the last entry of the chain is what guarantees it as the ultimate
fallback, not a hardcoded branch.

Plural-aware keys live in a SEPARATE catalog (`plural_catalog`), keyed the
same way but each value is a record of CLDR category -> template. Keeping
plural entries in their own record (rather than detecting "is this catalog
value a string or a category record" at lookup time) avoids needing a
runtime type-introspection builtin, which Hey does not expose. The caller
already knows whether a key is plural-shaped, because they wrote the copy.

## Plural rules — the honest answer

The package implements exactly three shapes: a cheap "one vs everything
else" default, Polish, and Arabic. It does not implement full CLDR
(Unicode covers ~40 distinct rule sets).

- **English, Spanish, German, and most Romance/Germanic languages**: the
  cheap default (`n == 1 -> 'one'`, else `'other'`) is CORRECT.
- **Polish** has THREE cardinal categories: `one` (n==1), `few` (n mod 10
  in 2..4, and n mod 100 NOT in 12..14), `many` (everything else). A
  one/other system prints the same word for "2 files" and "5 files",
  which reads as broken grammar to a native speaker.
- **Arabic** has SIX categories (`zero`, `one`, `two`, `few`, `many`,
  `other`), keyed off `n mod 100`. A one/other system collapses four of
  them, producing unidiomatic text for the majority of possible counts.

Adding a real CLDR rule for a new language is one private function
(`i18n_plural_category_<lang>`) plus one branch in
`i18n_plural_category_for` — the public API never changes. Dispatch is an
if/else chain on the base subtag, deliberately not a record of stored
callables, matching established Hey idiom.

Missing-category fallback follows CLDR practice: `plural_lookup` looks in
a locale’s OWN table for the specific category first and falls back to
that SAME locale’s `'other'` entry before trying the next locale in the
chain. A translator who filled in `one`/`other` but not `few` for Polish
gets grammatically-acceptable Polish, never a sentence in a different
language.

## Single-pass interpolation — the re-scan bug

Naive interpolation that loops `replace_all` over its own growing output
breaks the moment a substituted VALUE contains another placeholder token.
The stdlib’s `Text.format` has this bug (reproduced on Hey 0.99.466a):

```hey
Text.format('{a}{b}', {a: '{b}', b: 'X'})   # prints XX (wrong)
I18n.render('{a}{b}', {a: '{b}', b: 'X'})   # prints {b}X (correct)
```

`I18n.render` tokenizes the TEMPLATE exactly once, up front, into an
ordered list of literal/ref segments using only the original template
text. Rendering walks that fixed segment list once, building the output by
appending, never by searching. Placeholder DISCOVERY finishes before any
value is inserted, so no escaping syntax is needed for values.

Known, accepted limitation on TEMPLATE text itself: a template cannot
contain a literal `{` or `}` outside a placeholder — an unmatched opener
is treated as plain literal text for the remainder of the string (it does
not crash or eat the page; it just stops looking). If a catalog ever needs
a literal brace, the fix is a documented `{{`/`}}` escape added to the
tokenizer — not built now, to avoid solving a problem nobody has yet.

## render_body and delimiter choice

Hey apps commonly bake page assets into compiled `'''...'''` heredoc
constants, so localizing page copy means changing what an already-baked
string looks like per request. `render_body(body, catalog, chain, open,
close)` runs the same single-pass tokenizer over the whole body with
caller-chosen delimiters (e.g. `'@@'`/`'@@'`) and resolves each token via
`t` through the same catalog/chain as server copy. One scan over a few KB
of markup per request.

Do NOT reuse `{name}` as the page-token syntax: page assets are full of
literal CSS/JS braces. Pick a delimiter that does not appear in your own
markup and verify that with a grep over your assets — the delimiter choice
is per-application by design, which is why `open`/`close` are parameters.

## Accept-Language negotiation

`locale_for_request(request, catalog, default_locale)` reads the
`accept-language` header with the raw `get` builtin
(`get(get(request, 'headers'), 'accept-language')`), not a stdlib Web
helper: every stdlib call from compiled app code pays a per-call
interpreter delegation cost (~7 ms measured in the origin app), and locale
resolution sits on the request path. `stdlib:Web` request records carry
headers as a plain record with pre-lowercased names, so the raw read is
the whole job.

Negotiation walks every header entry in order; for each entry it tries the
FULL tag first (`en-GB` before `en`), then its base language, and returns
the first locale the catalog actually carries. Nothing carried means
`default_locale` comes back — an unknown language never leaks out as the
resolved locale. This folds in the behaviour the origin app arrived at
independently (`Strings.negotiate`); the prototype originally returned the
raw first tag, which is why this package’s signature takes the catalog
where the prototype’s did not. Q-values are stripped, not ranked (header
order wins); full RFC 4647 ranking is a documented non-goal for now.

One deliberate split from the origin app worth repeating: a web page
should follow the DEVICE (Accept-Language), but a shared/public screen
(e.g. a TV a whole room watches) should stay pinned to an
operator-configured locale — a room has no single device language.

## The apostrophe rule

No ASCII apostrophe (`'`, U+0027) in any catalog VALUE, ever — use the
Unicode right single quotation mark (`’`, U+2019), or phrase without
contractions. Two independent reasons:

1. Catalog entries are ordinary single-quoted Hey string literals; a
   literal ASCII `'` ends the string early — a syntax error at any length.
2. `heyc build` fails HIR emission when a `'''...'''` heredoc contains a
   literal `'` past roughly 425 bytes of content, so any page asset used
   with `render_body` inherits the rule for its static markup too.

U+2019 is the typographically correct character for an apostrophe in
running text (CLDR locale data for French, Italian, and Catalan already
prefers it), so the rule removes an anti-pattern, not a feature. A cheap
mechanical guard: a well-formed one-line catalog entry has exactly two `'`
characters on its line, so "more than 2 single quotes on a catalog line"
is a sufficient lint grep.

## Non-goals (for 0.1.0)

- Full CLDR plural coverage (three shapes shipped; extension is one
  function plus one branch).
- RFC 4647 Accept-Language q-value ranking (header order wins).
- `{{`/`}}` template-side brace escaping (no known copy needs it).
- Any mutable registry or boot-time registration hook (impossible in Hey
  by design, and not wanted).

## Build and dependency baseline

- Hey stdlib only (`stdlib:Text`); no package dependencies.
- `hey_packager` is local build/release tooling, not a runtime package
  dependency.

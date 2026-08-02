# DESIGN

## A cache is a VALUE, not a service

`HeyCache.open` returns a record. Every operation takes a cache and returns
a new one, with the memory layer, the clock and the counters inside it.

The alternative was an actor owning mutable state. Value-threading won on
three counts:

1. **It is identical in both lanes.** The package is gated on a receipt that
   is compiled AND interpreted with the stdouts diffed byte for byte; a
   value-threaded design has no scheduling to diverge.
2. **Expiry becomes testable without sleeping.** The clock is a field.
   `HeyCache.advance(cache, 500)` lands exactly on the boundary. A sleeping
   expiry test is slow, flaky, and cannot assert the boundary at all.
3. **Every layer is inspectable.** `HeyCache.probe` reads one named layer
   with no fallthrough, which is the only honest way to verify invalidation.

The cost is real and is stated in the README: no single-flight, and the
caller must thread the cache.

## Persistent layers are INJECTED, never imported

`hey_cache` has zero dependencies. A store layer takes a handle plus three
callables — `fetch` / `write` / `erase` — which are exactly `hey_record`'s
store surface.

This was not invented here. `hey_record`'s own `store.hey` says it "never
dials and never imports a driver", takes an injected connection record, and
declares no dependencies; and across every `hey_*` package in the ecosystem
there is not one `import 'pkg:...'`. Injection is the practice, not the
documented alternative.

What it buys: `HeyRecordStore.file(root)` is the file layer,
`HeyRecordStore.sql(connection, table)` is the SQLite layer AND the MySQL
layer, and `hey_cache` contributes no SQL, no schema, no dialect handling and
no file layout to any of them. Building a file/sqlite/mysql layer here
instead would have duplicated code `hey_record` had already debugged — the
copy-paste-into-forks failure this ecosystem calls its most expensive
mistake.

## `not_found` is a miss; every other failure is an ERROR

The tempting shortcut is to treat any non-answer from a layer as a miss.
That makes a dead database indistinguishable from a cold cache: the chain
falls through to the application for every key, the outage is invisible in
the cache's own reporting, and the recompute traffic gets blamed on cache
tuning.

So a layer returning a code other than `not_found` produces an entry in
`result.errors`, increments the error counter, and the walk continues.

## Write-back clamps DOWN, never up

A promoted entry keeps its original `expires_at_ms`. If layer 2 says this
dies at T, layer 0 does not get to say T + ttl — otherwise a value would gain
life every time it was promoted, and a hot key would become effectively
immortal. Where the receiving layer's own ttl is shorter, the entry is
clamped down to it.

## `forget` never stops early

Invalidation attempts every layer even after one fails, and reports per
layer. A delete that stops at layer 0 looks correct through the chain and is
wrong only later, when layer 0 is cold and a stale deep copy surfaces and is
promoted back up as if it were fresh.

This is why `HeyCache.probe` exists at all: reading through the chain cannot
distinguish "deleted everywhere" from "deleted at layer 0 and shadowed".

## The sensitive-value guard is a default, not a prohibition

Store layers refuse `{sensitive: true}` values unless they opt in. The
refusal is reported by layer name and counted, so a caller that must know the
value did not persist can find out, and an operator can alarm on it.

It guards against accident. It is not a secrets manager: it encrypts nothing
and cannot stop a caller passing `{sensitive: false}`.

## Two compiler behaviours this design is shaped around

Both were measured on `heyc` 0.99.474a, and both are lane disagreements —
which is why the two-lane receipt is a gate rather than a nicety.

1. **A record field named the same as the variable holding it does not
   lower.** `layer.layer` runs correctly on the interpreter and produces
   `cannot lower: string expression get(layer, "layer")` from `heyc build`.
   The layer discriminator is therefore `backing`, not `layer`.
2. **`del(record, key)` does not lower.** The memory layer removes a slot by
   rebuilding the record without it (`hey_cache_without_key_value`).

3. **A `nil` returned through a dynamically invoked callable arrives as the
   integer `0`** in the compiled lane, and as `nil` on the interpreter. That
   is why absence is signalled with `HeyCache.no_value()` — a record —
   rather than with `nil`. Records round-trip identically in both lanes.

And one API consequence: `bind()` does not lower, but a **bare callable
does**, including a module-qualified one stored in a record inside a list and
invoked dynamically. That is why read-through takes a real callable today
rather than a name string.

# GETTING STARTED

## A memory-only cache

```hey
import 'pkg:hey_cache@0.1.0/main'

fn render(key)
  return expensive(key)
end

program
  let cache = HeyCache.open({
    namespace: 'pages',
    layers: [HeyCache.memory_layer('mem', {})],
    default_ttl_ms: 60000,
  })
  let out = HeyCache.fetch(cache, 'home', render, {})
  says out.value
  # KEEP THE NEW CACHE. Every operation returns one.
  set cache = out.cache
end
```

Run `examples/basic.hey` for this end to end.

## Adding a persistent layer

A store layer takes a handle and three callables. With `hey_record`:

```hey
let disk = HeyCache.binding(
  HeyRecordStore.file('/var/cache/pages'),
  HeyRecordStore.fetch,
  HeyRecordStore.store,
  HeyRecordStore.delete
)

let cache = HeyCache.open({
  namespace: 'pages',
  layers: [
    HeyCache.memory_layer('mem', {ttl_ms: 30000}),
    HeyCache.store_layer('disk', disk, {ttl_ms: 3600000}),
  ],
})
```

Swap `HeyRecordStore.file(root)` for
`HeyRecordStore.sql(connection, table)` to put the layer in SQLite or MySQL.
The `connection` is whatever `hey_sqlite3` or `hey_mysql` handed you;
`hey_cache` never dials one.

Pass the callables by **bare name**. Do not wrap them in `bind()` — it does
not survive the compiled lane.

## Three things that will bite you

1. **Thread the cache.** `HeyCache.fetch` does not mutate; it returns
   `{cache: ...}`. Dropping it silently discards every population.
2. **Verify invalidation with `probe`, not with a lookup.** A lookup after a
   partial delete is a *hit* from a stale layer, and it repopulates layer 0.
3. **Sensitive values do not persist by default.** Check `result.refused`
   rather than assuming `write` wrote everywhere.

# ROADMAP

## 0.1.0 deliberately does not do these

**Single-flight / miss-storm suppression.** When a hot key expires, N
concurrent callers each call the application. Stated in the README rather
than left silent. A fix needs either an actor owning the cache or a lock in a
shared layer; both are design decisions, not patches.

**Negative caching.** A compute returning `HeyCache.no_value()` caches
nothing, so the next miss calls the application again. *Remembering* an
absence needs an absence envelope that survives a store layer round trip and
a decision about its TTL, which is a design question rather than a flag.
Reported as `capabilities().negative_caching == false`.

**Eviction policy.** No LRU, no size bound. Memory layers grow until entries
expire or `HeyCache.sweep` runs. A memory layer with `default_ttl_ms: 0` and
no sweeping is an unbounded map.

**Sweeping store layers.** `HeyCache.sweep` only touches memory layers.
Sweeping a store means enumerating a whole collection, which is a
backing-store decision. Expired store entries are still evicted lazily by the
read that finds them.

**Any wire protocol, server or distributed mode.** Out of scope by
instruction: "redis-like substitute" is the ROLE, not the protocol.

**A tested MySQL layer.** The SQL layer is exercised end to end against a
real `hey_sqlite3` connection (gate 5). The MySQL path is the *same*
`HeyRecordStore.sql` code with `hey_record`'s mysql dialect, and it is
believed to work — but believed is not measured, and no MySQL server was
available. Gate 5 should be parameterised over both adapters.

**Async / batched layer reads.** Every layer is read serially.

## Likely 0.2.0

1. A gate-5 variant against MySQL, so the claim in the README's layer table
   is measured for both dialects rather than one.
2. Bounded memory layers with an explicit eviction policy, since the honest
   answer today is "unbounded".
3. Single-flight behind an actor, if and only if there is a real workload
   showing the herd, with the value-threaded API kept as the substrate.
4. Layer kinds supplied entirely by callables, so a consumer can add a layer
   type without a change here. The store layer already proves the shape.

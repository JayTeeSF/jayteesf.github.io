# Cagents v2 storage amendment — SQLite first

**Date:** 1 September 2026  
**Status:** supersedes the PostgreSQL-first storage recommendation in `cagents_v2.md`

## Decision

Cagents v2 starts with:

```text
Cagents API / service
        |
        v
Cagents semantic storage layer
        |
        v
    hey_record
        |
        v
   hey_sqlite3
        |
        v
workspace.sqlite3
```

PostgreSQL is **not** the launch dependency.

The service owns SQLite through an authenticated API. Humans, agents, CLIs, mobile apps and provider wrappers do not directly open or synchronize the authoritative database.

## Why this changes the concurrency problem

The present Cagents failure is not merely that Git writes are serialized. It is that every participating agent can leave its checkout dirty and thereby interfere with other actors' ability to persist coordination state.

In v2, the Cagents server owns persistence. Ordinary SQLite can intentionally serialize tiny write transactions while allowing WAL readers to proceed concurrently.

Use one database per workspace so the relevant capacity question is:

> **How much write contention does the hottest workspace create?**

—not “How many Cagents customers exist?”

Hundreds of independent customers can therefore mean hundreds of independent SQLite files/write lanes.

## Launch SQLite profile

Initial conservative settings:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

The server maintains one bounded write coordinator per active workspace/database. Reads use separate owned connections where useful.

No slow external work may occur inside a write transaction:

```text
forbidden inside transaction
  LLM request
  Git provider API
  A2A remote call
  MCP network tool call
  compiler/build
  human wait
```

Instead:

```text
transaction A
  validate + record intent + event/outbox
commit

slow work

transaction B
  validate revision + record result/evidence/state
commit
```

## Existing Hey packages already give the right abstraction

`JayTeeSF/hey_record` is database-independent porcelain and already accepts injected database connections.

`JayTeeSF/hey_sqlite3` already exposes the connection callback contract used by `hey_record`, including parameterized query/execute operations, transactions, affected-row counts and cancellation.

Cagents should therefore depend on `hey_record` semantics rather than SQLite-specific calls throughout the application.

The intended ladder is:

```text
CagentsStore
    |
hey_record
    |
    +--> hey_sqlite3   launch/default
    |
    +--> hey_turso     measured concurrent-write upgrade
    |
    +--> hey_postgres  later escape hatch only if required
```

## Honker

Honker is useful but solves a different problem.

It adds Postgres-like operational facilities to a normal SQLite file:

- `NOTIFY` / `LISTEN`-style wakeups;
- durable queues;
- durable streams;
- scheduler;
- retries/dead-letter behavior;
- named locks/rate limits;
- transactional-outbox helpers.

It explicitly does **not** add multi-writer replication and still rides ordinary SQLite's one-writer model.

Therefore `hey_honker` is an optional package, not the Cagents concurrency engine.

Create/use it when Cagents or another Hey application benefits enough from reusable SQLite queue/stream/pubsub semantics to justify the dependency. The core Cagents outbox does not require Honker to function.

Primary project:

- https://github.com/russellromney/honker

## Preferred true-concurrent upgrade: Turso Database

Turso Database is currently the most strategically aligned next engine.

Its project describes an in-process Rust database compatible with SQLite, with:

- SQLite dialect/file/C-API compatibility work;
- MVCC `BEGIN CONCURRENT` for improved write throughput;
- CDC;
- broad language bindings;
- experimental multi-process WAL coordination;
- an experimental Postgres dialect/wire frontend built on the same database VM/core.

That makes it unusually well matched to the desired direction: keep SQLite deployment/data-model simplicity while gaining more Postgres-like concurrency, without immediately taking on PostgreSQL as infrastructure.

The package boundary should be a separate:

```text
JayTeeSF/hey_turso
```

implementing the same `hey_record_connection` shape rather than silently changing what `hey_sqlite3` means.

Turso is not the launch default yet because important pieces remain beta/experimental. Cagents should benchmark the exact workload and adopt it after it beats ordinary SQLite on a real bottleneck with acceptable durability/recovery behavior.

Primary project:

- https://github.com/tursodatabase/turso

## Other researched alternatives

### mvSQLite

A Rust SQLite VFS backed by FoundationDB with distributed MVCC, scalable lock-free reads/writes, time travel and FoundationDB replication/backup semantics.

Technically strong, but operationally it means running FoundationDB + `mvstore`, so it no longer meets the lightweight startup goal.

- https://github.com/losfair/mvsqlite

### FrankenSQLite

A young Rust clean-room SQLite implementation with page-level MVCC/SSI and strong concurrency ambitions. Interesting benchmark/research target, but not yet the conservative authority choice for paying customers.

- https://github.com/Dicklesworthstone/frankensqlite

### MPEdb

Another young Rust project adding PostgreSQL-like MVCC/concurrent process behavior over SQLite-compatible storage. Interesting, but ecosystem/adoption/licensing evidence is currently too thin for Cagents authority.

### libSQL

Useful for remote/replicated SQLite patterns, but it does not fundamentally remove the single-writer architecture that motivated this investigation.

### SQLite `BEGIN CONCURRENT`

SQLite maintains experimental optimistic multi-writer work outside normal trunk releases. Carrying a non-trunk SQLite build in `hey_sqlite3` is currently a worse maintenance tradeoff than starting on standard SQLite and evaluating Turso when required.

## Benchmark before database migration

Cagents must instrument:

```text
write transaction duration
write-queue wait p50/p95/p99
commit rate per workspace
peak write queue depth
SQLITE_BUSY / retry rate
WAL size
checkpoint duration / starvation
commit-to-realtime-delivery latency
backup/restore duration
CPU / fsync utilization
```

Build a hot-workspace workload with many clients sending messages, acknowledgements, session events, task transitions and one-shot grant races while readers, realtime delivery and Git export run concurrently.

## `hey_turso` trigger

Evaluate/build `hey_turso` when ordinary SQLite is proven to be the bottleneck after sensible schema/index/transaction tuning—for example when the write coordinator remains saturated and p95/p99 queue wait violates the product latency budget.

Do not migrate because customer count reached an arbitrary number.

## `hey_postgres` trigger

Move to PostgreSQL only when a demonstrated requirement cannot be met economically/safely by the SQLite-compatible ladder, such as:

- one workspace needs sustained concurrency beyond validated Turso behavior;
- multi-node writable HA/replication/PITR requirements exceed the embedded stack;
- customer infrastructure mandates PostgreSQL;
- database/query size materially outgrows file-per-workspace operation;
- cross-workspace transactional semantics become an actual product requirement.

At that point the intended migration remains:

```text
CagentsStore -> hey_record -> hey_postgres
```

rather than a Cagents domain rewrite.

## Updated P0

1. Stable semantic IDs.
2. Cagents storage/domain interface above `hey_record`.
3. `hey_sqlite3` launch schema.
4. Workspace-per-database partitioning.
5. WAL/full-durability profile + bounded write coordinator.
6. Revisions, idempotency, semantic event receipts and transactional outbox.
7. API-backed existing CLI/provider wrappers.
8. Git importer + deterministic exporter.
9. Cagents hot-workspace contention benchmark and instrumentation.

Only after those steps should Cagents decide whether it needs `hey_turso`.

## Companion research

The detailed comparison lives at:

```text
JayTeeSF/cagents/research/2026-09-01-sqlite-first-concurrency-options.md
```

That research supersedes the PostgreSQL-first recommendation in the earlier storage note while preserving its larger conclusion: Git should remain a portable, deterministic export/import/audit representation rather than the realtime transactional write substrate.
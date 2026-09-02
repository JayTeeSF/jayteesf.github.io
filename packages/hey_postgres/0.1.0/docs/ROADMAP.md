# Roadmap

- Bounded connection pool (`Postgres.pool`) with acquire timeout, idle/max
  lifetime, health checks, and backpressure.
- COPY IN/OUT and cursor streaming with backpressure.
- `LISTEN`/`NOTIFY` delivery.
- Binary parameter/result formats for hot paths.
- Prepared-statement caching helpers.

The current release covers connect, parameterized query/execute, query_one,
prepared statements, transactions, typed rows, and health.

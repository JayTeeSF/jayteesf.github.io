# Roadmap

- Appender API for high-throughput bulk load.
- Typed binding for integers/doubles/blobs (beyond varchar binding).
- Arrow and streaming result interfaces.
- Explicit Parquet import/export helpers over `read_parquet`/`COPY`.

The current release covers open/close, query, parameterized query_params,
query_one, and typed row decoding on in-memory and file databases.

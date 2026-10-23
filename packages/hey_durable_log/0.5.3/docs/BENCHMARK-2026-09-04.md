# Group-commit benchmark — 2026-09-04

This checkpoint measures the packaged broker and journal core on the same
executor used for the cagents storage comparison. Each producer submits one
record at a time and waits for its durability receipt. The broker uses a
bounded queue, a 64-record maximum batch, a 250 microsecond window, and one
`fdatasync` per DATA+COMMIT batch.

## Results

Three runs at 8 producers × 250 records:

| Run | Throughput | p50 | p95 | p99 | Durable batches | Average batch |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 20,151/s | 0.385 ms | 0.464 ms | 0.554 ms | 250 | 8.00 |
| 2 | 18,910/s | 0.399 ms | 0.509 ms | 0.803 ms | 257 | 7.78 |
| 3 | 18,134/s | 0.421 ms | 0.562 ms | 0.945 ms | 252 | 7.94 |
| **median** | **18,910/s** | **0.399 ms** | **0.509 ms** | **0.803 ms** | **252** | **7.94** |

One saturation run at 64 producers × 100 records:

| Throughput | p50 | p95 | p99 | Durable batches | Average batch | Largest batch |
|---:|---:|---:|---:|---:|---:|---:|
| **94,764/s** | 0.635 ms | 0.932 ms | 1.348 ms | 102 | 62.75 | 64 |

All 12,400 submitted records received successful durability receipts; the
test process reported zero failures.

## Interpretation

The standalone package reproduces the earlier cagents application prototype's
shape: about 20k durable records/second with eight synchronous producers and
about 100k/second when enough producers fill 64-record batches. It does so
while adding committed-batch recovery, a previous-frame checksum chain,
bounded backpressure, and fail-closed corruption handling.

This is a local filesystem microbenchmark, not a production durability claim.
The launch gate still requires representative NVMe hardware, process-kill and
power-loss testing, rotation, projection replay, and quorum-replica tests.

## Reproduce

```sh
bin/check
bin/benchmark 8 250 64 250
bin/benchmark 64 100 64 250
```


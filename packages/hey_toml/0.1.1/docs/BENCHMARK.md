# Configuration decoding measurements

Local Darwin arm64, 16 October 2026. Seven alternating repetitions; each sample parses the same logical configuration repeatedly into ordinary values. This measures these implementations, not an inherent ranking of every TOML and JSON parser.

| Tables | JSON bytes | TOML bytes | JSON median µs/parse | TOML median µs/parse |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 687 | 555 | 3.32 | 10.85 |
| 8 | 3578 | 2753 | 14.05 | 44.09 |
| 64 | 26814 | 20445 | 103.88 | 316.79 |

TOML includes its native interface and validated tree conversion; JSON uses the built-in decoder directly. Disk I/O, shared-library loading, process startup, schema validation and compilation are outside the timed loop. Fixtures are public synthetic configuration, not private application data.

## Memory and size

Fresh workers parsing the 64-table fixture 2,000 times were measured three times each with Darwin `/usr/bin/time -l`. Kernel peak resident memory includes worker startup and is not a configured memory limit.

| Worker | Median kernel peak RSS |
| --- | ---: |
| JSON | 2.66 MiB |
| TOML | 3.42 MiB |

The benchmark executable is 175776 bytes; the native TOML extension is 88880 bytes. These are Darwin arm64 build artifacts, not a standalone portable distribution or a production Linux footprint. The executable contains both benchmark routes; it is not a minimal JSON-only size comparison.

Separate ~50ms RSS samples are also retained in the raw evidence; the kernel peaks above are more reliable for these short workers. No database, S3 service or compiler process is included in worker memory.

## Interpretation

JSON was faster in this comparison. The largest tested TOML configuration still decoded in less than one millisecond, so startup-only parsing cost is small compared with a data transfer. TOML provides comments and readable configuration syntax; choosing it for operator-edited settings is our inference, not a performance claim. JSON remains appropriate for generated manifests and receipts. No equivalent YAML implementation was benchmarked, so this report does not assign it a performance rank.

## Reproduce

Build `specs/benchmark.hey` to `build/benchmark-worker`, run `ruby specs/benchmark.rb`, then use fresh processes with `/usr/bin/time -l` for kernel peak RSS. See [raw measurements](results/benchmark.json), [passing conformance](CONFORMANCE.md) and [API mapping](README.md).

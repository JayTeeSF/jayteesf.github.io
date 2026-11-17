# When to choose TOML or JSON

**Use JSON by default for generated configuration and machine-to-machine plans. Choose TOML when people regularly edit the file and comments help them operate it.** Parsing either format once at startup is inexpensive on the configurations tested here.

| Need | Prefer | Reason |
| --- | --- | --- |
| A program generates most of the configuration | JSON | Direct object/array representation and standard encoders; no separate TOML parser needed when the host already supplies JSON. |
| Operators hand-edit settings and need comments | TOML | `#` comments, sections and literal strings can explain settings next to their values. |
| Deeply nested transformation rules generated from a UI | JSON | The generated policy can retain its existing object/array shape. This is a usability judgment, not a format limitation. |
| Small hand-maintained service configuration | TOML | Section-oriented syntax can be easier to review. Confirm with the actual people editing the file. |
| Generated manifests, checkpoints and status receipts | JSON | Existing machine tools and explicit versioned data contracts are a good fit. |
| Lossless TOML date/time type identity | TOML typed API | The package preserves those types explicitly; ordinary JSON has no native date/time type. |
| Lowest measured parse cost in this comparison | JSON | Our built-in JSON route was approximately three times faster than this package's complete decode route. |

## What we measured

Seven alternating repetitions on Darwin arm64, parsing equivalent synthetic configurations into ordinary values:

| Configuration | JSON | TOML |
| --- | ---: | ---: |
| 1 table; 687-byte JSON / 555-byte TOML | 3.32 µs | 10.85 µs |
| 8 tables; 3,578-byte JSON / 2,753-byte TOML | 14.05 µs | 44.09 µs |
| 64 tables; 26,814-byte JSON / 20,445-byte TOML | 103.88 µs | 316.79 µs |

The largest TOML case still decoded in **0.317 milliseconds**. Fresh-worker median kernel peak RSS was **2.66 MiB for JSON** and **3.42 MiB for TOML**. The TOML extension was **88,880 bytes** in the measured Darwin arm64 build. These figures cover these implementations and fixtures, not every parser or a production Linux deployment. Disk I/O, process/library startup and application validation are excluded from the timed parse loop. TOML includes its native interface and tree conversion. See [full method and raw measurements](BENCHMARK.md).

For a long-running worker reading one configuration, the difference between 0.10 and 0.32 ms is unlikely to determine data-transfer speed. That is our inference from these measurements. Avoid reparsing configuration per database row; retain one validated immutable configuration for the run.

## Example: the same settings

JSON is convenient for generation:

```json
{
  "storage": { "bucket": "example-backups", "prefix": "exports/" },
  "limits": { "chunk_rows": 20000 }
}
```

TOML can carry an operator's explanation:

```toml
[storage]
bucket = "example-backups"
prefix = "exports/" # Keep these artifacts separate from other workflows.

[limits]
chunk_rows = 20_000
```

These examples are original illustrative configuration, not real service settings.

## Validation is required for either choice

TOML parsing does not establish that a field name is supported, a destination is safe, or a masking policy covers every exported column. Apply the same schema and semantic checks after either decoder. Keep credentials as references, and freeze the effective policy digest for a run. Neither this package nor the file format resolves secrets automatically.

The TOML specification rejects duplicate key definitions. JSON's RFC recommends unique names but permits parsers to support extensions; acceptance behavior must be checked in the actual implementation. If the application requires duplicate-key rejection or strict JSON syntax, enforce that at the input boundary; post-parse schema validation cannot recover an overwritten duplicate. JSON does not provide comments in its standard grammar. [TOML 1.1 specification](https://toml.io/en/v1.1.0), [JSON RFC 8259](https://www.rfc-editor.org/info/rfc8259/).

TOML has no null literal. Use an explicit action such as `action = "null"` for a transformation policy, or omit an optional setting according to the schema; do not invent a null spelling. Unquoted TOML dates are typed dates, so quote a value when the application's schema expects a string. These differences matter when converting an existing JSON configuration.

## Why this guide does not rank YAML performance

YAML supports comments and nested configuration, and a safe loader can restrict object construction and aliases. It is a reasonable option where the team already depends on a suitable YAML parser. No comparable compiled YAML route was measured in this study, so there is no justified JSON/TOML/YAML speed ranking here. YAML loader/version semantics also need explicit testing; avoid assuming every YAML reader resolves scalar types identically. [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/), [Psych safe-load documentation](https://ruby-doc.org/3.4.1/exts/psych/Psych.html).

This package is optional when built-in JSON already meets the application's needs. Its role is to make standards-tested, bounded TOML configuration available when hand-editing benefits justify it. See [passing conformance results](CONFORMANCE.md) and [API limitations/value mapping](README.md).

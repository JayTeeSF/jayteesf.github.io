# TOML decoding

`Toml` reads TOML configuration into ordinary values for a separate schema validator. It does not choose application defaults, inspect environment variables, interpolate secrets, execute templates or open database connections.

| API | Result |
| --- | --- |
| `Toml.load(library_path)` | Open the native extension; returns its handle in a Result. |
| `Toml.limits()` | Explicit default input/native-memory/output limits. |
| `Toml.decode(extension, text, limits)` | Result containing a table of decoded values. |
| `Toml.decode_bytes(extension, bytes, limits)` | Same operation with explicit input bytes and UTF-8 validation. |
| `Toml.typed(extension, text, limits)` | Lossless type-tagged tree using the official toml-test JSON representation. |
| `Toml.typed_json(extension, text, limits)` | Lossless tagged JSON text, including escaped NUL in keys. |
| `Toml.typed_json_bytes(extension, bytes, limits)` | Same lossless representation from bytes. |
| `Toml.load_file(extension, path, limits)` | Size-check and read one file, then decode it. |
| `Toml.version()` | Package version. |

Strings, signed 64-bit integers, finite floats, booleans, arrays and tables become their ordinary values. Date/time values and nonfinite floats remain explicit `{toml_type, value}` records. Use `Toml.typed` when full type identity matters or an input table could resemble such a record. Typed scalar values are strings with the `string`, `integer`, `float`, `bool`, `datetime`, `datetime-local`, `date-local` or `time-local` tag. Tables and arrays preserve their structure.

Ordinary object and typed-object decoding explicitly reject NUL-containing keys with `toml_key_not_representable`; the lossless typed-JSON APIs preserve those keys. This prevents truncation in a host object representation that cannot retain them.

The typed-JSON API preserves keys exactly, including escaped NUL; object APIs reject such keys rather than truncate them.

Malformed TOML, duplicate definitions and invalid UTF-8 fail. Errors return a bounded code and available line number, without echoing configuration values. A syntactically valid file still requires application-specific schema and semantic validation.

The default limit is 1 MiB input, 16 MiB native parser/serialization allocations and 8 MiB encoded output; hard ceilings are 1/64/16 MiB respectively. These limits do not bound the caller's complete process or the host runtime's decoded object tree. Upstream imposes 30 nested array/bracket levels, 30 brace levels, 10 dotted-key parts and 16,384 entries per table/array; serialization additionally limits tree depth to 128. Time precision is microseconds; additional digits are truncated by the pinned parser. This release decodes only and does not preserve comments/formatting for rewrites.

See [TOML vs. JSON](CHOOSING_A_FORMAT.md) before adding a parser to an application that already supports JSON.

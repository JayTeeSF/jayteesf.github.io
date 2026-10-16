# API

Import `main.hey` as module `Synth`.

| Function | Successful value |
| --- | --- |
| `version()` | Package version string |
| `email(namespace, key, domain)` | Deterministic address |
| `name(namespace, key)` | Deterministic name |
| `email_plan(namespace, domain)` | Validated `{kind, prefix, suffix, key_max_bytes}` |
| `name_plan(namespace)` | The same component contract for names |
| `render(plan, key)` | Render a plan returned by this package |

Keys are nonnegative integers or nonempty ASCII letters/digits/underscore/hyphen strings. Negative integers, separators, whitespace and excessive lengths are refused. Key identity is preserved; no silent truncation, case conversion, random collision or hashing. Distinct keys remain distinct within one fixed namespace/domain; separate namespaces can overlap if callers choose ambiguous delimiter combinations. Integer `42` and string `42` intentionally identify the same key. Global uniqueness remains the caller's responsibility.

Email namespaces use lowercase letters/digits/hyphen/underscore, at most 40 characters. Domain names use lowercase DNS labels, at least two labels, each 1–63 characters, no leading/trailing hyphen, at most 253 characters. Generated addresses remain within 64 local-part bytes and 254 total bytes. This deliberately supports a small ASCII subset; it is not a validator for every valid mailbox or internationalized domain.

Names use the supplied UTF-8 namespace followed by a space and the stable key. Names are at most 128 bytes; namespace is at most 100 UTF-8 bytes and contains no ASCII controls. Use separate namespaces for first and last names. These are reproducible placeholders, not locale-specific realistic personal names.

Use `.invalid` domains for data that must not receive mail. The package also permits caller-owned domains; the application decides whether they are allowed. Original emails/names should not be passed as stable keys.

Plans let a bulk engine apply the same components without per-row object construction. A database projection must quote components safely, render keys without padding/localization, and enforce the key byte budget. This package contains no SQL, database adapter, policy configuration, credentials or consumer-specific data.

Limits are informed by [SMTP RFC 5321 §4.5.3.1](https://www.rfc-editor.org/rfc/rfc5321.html#section-4.5.3.1). Reserved invalid domains are defined by [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606.html). A rendered address is not evidence that a full record or free-text content contains no PII.

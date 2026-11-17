# Passing TOML 1.1 decoder results

The compiled package's lossless typed-JSON interface passed **214 valid + 467 invalid = 681 cases**, with **zero failures and no skipped cases**, using official `toml-test v2.2.0` in TOML 1.1 mode. This is decoder coverage; no encoder is supplied or claimed.

The test adapter maps runtime refusal status 70 to the runner's required invalid-input status 1; other exit statuses are preserved. It does not rewrite parser output or skip documents. Ordinary object APIs explicitly refuse NUL-containing keys because the host object representation cannot preserve them; the tested typed-JSON API preserves them exactly.

The pinned MIT-licensed upstream parser revision and checksums are recorded in `vendor/tomlc17/UPSTREAM.json`; the wrapper additionally enforces the published ASCII bare-token grammar and UTF-8/NUL input handling. Native boundary/resource tests and AddressSanitizer + UndefinedBehaviorSanitizer checks also passed.

Run `bin/check` and `bin/check-conformance`. Only final passing evidence is committed: [official results](results/conformance.txt), [sanitizer receipt](results/sanitizers.txt), and [performance evidence](results/benchmark.json). Test runner and compiler caches stay in ignored `build/`.

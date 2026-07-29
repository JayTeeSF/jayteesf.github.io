# Testing

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
bin/check
bin/release
unzip -tq dist/hey_i18n-0.1.0.zip
```

`bin/check` runs `specs/i18n_spec.hey` through `heyc --test`, verifies the
package manifest, and delegates version-consistency and docs/example
checks to `hey_packager`. The spec covers: fallback chains, chain lookup
and visible-missing keys, the single-pass interpolation re-scan case that
stdlib `Text.format` gets wrong, plural categories for the default rule,
Polish, and Arabic, same-locale `'other'` plural fallback, page-body token
substitution over brace-heavy markup, and Accept-Language negotiation
(full regional tag before base language, default on no match, missing
header, missing headers record).

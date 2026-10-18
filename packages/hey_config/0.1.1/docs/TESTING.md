# Testing

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
bin/check
```

`bin/check` is hey_packager's shared check: VERSION and `hey-package.json`
agree, every copy listed in `hey-version-files` holds the version,
`hey package verify` accepts the manifest, the required docs exist, and
`docs/examples/basic.hey` runs. It then runs `bin/package-check`.

Package release metadata is processed by compiled Hey through hey_packager >= 0.1.11; Python is not required. Toolchain discovery accepts HEY/HEY_ROOT or PATH, with a relative sibling checkout as the fallback.

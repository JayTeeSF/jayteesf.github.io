# Packaging and distribution

`hey_web` no longer maintains a private checksum or release-record format. All package releases use `hey_packager` and Hey's canonical `hey package pack` implementation.

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
export HEY_PACKAGER_ROOT="$HOME/dev/hey_packager"
bin/check
bin/release
```

The release directory contains the installable ZIP, canonical `.release.json`, `SHA256SUMS.txt`, complete documentation publication tree, and a registry-publication ZIP. `bin/package-zip` is an alias for `bin/release`.

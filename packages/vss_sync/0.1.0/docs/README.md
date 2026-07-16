# vss_sync 0.1.0

`vss_sync` is a pure Hey package containing the shared, transport-independent
parts of the VSS ciphertext synchronization protocol.

It provides:

- protocol and envelope format identities;
- canonical client/server route construction;
- encrypted revision validation;
- recovery-key envelope validation;
- deterministic winner/alternate conflict selection through `stdlib:sync`.

It deliberately does not provide HTTP hosting, persistence, authentication-token
storage, Keychain/Keystore integration, cryptographic key ownership, native UI,
or application policy.

## Download

- `vss_sync-0.1.0.zip` — immutable package payload
- `vss_sync-0.1.0.release.json` — archive, manifest, and content SHA-256 identity

## Install

```sh
mkdir -p "$HOME/Downloads/vss_sync-0.1.0"
cd "$HOME/Downloads/vss_sync-0.1.0"

curl -fLO https://www.jayteesf.com/packages/vss_sync/0.1.0/vss_sync-0.1.0.zip
curl -fLO https://www.jayteesf.com/packages/vss_sync/0.1.0/vss_sync-0.1.0.release.json

cd /path/to/your/hey/project

hey package install \
  --release "$HOME/Downloads/vss_sync-0.1.0/vss_sync-0.1.0.release.json" \
  --archive "$HOME/Downloads/vss_sync-0.1.0/vss_sync-0.1.0.zip" \
  --root .hey/packages \
  --lock hey.lock.json
```

Then import the pinned release:

```hey
import 'pkg:vss_sync@0.1.0/main'
```

See [Getting started](GETTING_STARTED.md), [design](DESIGN.md), and the
[roadmap](ROADMAP.md).

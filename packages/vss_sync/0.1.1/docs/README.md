# vss_sync

`vss_sync` is an independently versioned Hey package for the pure, shared parts
of the VSS v3 ciphertext protocol:

- protocol/format identities;
- route construction;
- revision and recovery-envelope validation;
- deterministic causal winner/alternate selection.

It deliberately does **not** own HTTP hosting, persistence, bearer registries,
Keychain/Keystore, cryptographic key storage, native UI, or product policy.

The authoritative documents for this package live alongside this one:

- `docs/DESIGN.md` - what it is for and where the boundary sits
- `docs/GETTING_STARTED.md` - installing and calling it
- `docs/ROADMAP.md` - what each version covers
- `docs/TESTING.md` - how to verify it

Working notes for humans are in `docs/humans/`, and the agent seat's state
lives in `docs/agents/`.

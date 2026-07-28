# vss_sync continuation prompt

Read before coding:

1. `docs/humans/north-star.md`
2. `docs/humans/roadmap.md`
3. `docs/humans/hey-extraction.md`
4. `docs/agents/in-progress.md`
5. `docs/agents/todo.md`
6. `docs/agents/done.md`
7. `docs/agents/lessons.md`
8. `docs/agents/verification.md`
9. `hey-package.json`, source, and specs

Rules:

- Keep the package pure Hey and protocol-specific.
- Do not add HTTP hosting, persistence, token registries, Keychain/Keystore, or UI.
- Preserve ciphertext-only validation and deterministic conflict semantics.
- Make one versioned commit/tag per slice.
- Update every tracking document and run `./bin/verify`.
- Generate both `./bin/package` and `./bin/source-zip` from a clean committed tree.
- App/server consumers must install immutable verified archives and pin lockfiles.


## Canonical fresh-LLM handoff command

```sh
cd "$HOME/dev/vss-sync"
./bin/source-zip --out "$HOME/Desktop/vss-sync-source-v$(cat VERSION).zip"
```

Keep this package pure and platform-neutral. Native iOS, Android, browser, and
server repositories consume immutable package archives rather than editable
sibling imports.

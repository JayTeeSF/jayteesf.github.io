# Roadmap

1. Consume an installed `hey_packager` package command without requiring a sibling checkout.
2. Add signed release attestations and optional GitHub release publication.
3. Add registry index generation after multiple package consumers prove the shape.
4. Add reproducibility receipts comparing two independently generated archives.
5. Keep registry hosting and credentials outside Hey core.

## 0.1.1 — package controls

- Adopt `hey_packager >=0.1.1 <0.2.0`.
- Separate package tests (`bin/package-check`) from shared validation (`bin/check`).
- Generate deterministic release, registry-publication, checksum, and source-handoff artifacts through one tool.
- Publish complete required documentation and an executable documentation example.

## 0.1.2 — validation hardening

- Verify the package manifest before package-specific integration checks.
- Refuse unsafe release output directories before recursive cleanup.
- Run documentation examples from the configured Hey checkout so all stdlib modules resolve consistently.
- Mark source handoff archives explicitly as unverified.

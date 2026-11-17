# Retrofitting MMeoww to hey_pipeline

MMeoww is the reference migration because `bin/mmeow-gate` is the design source for this package.

## What stays

Keep the existing MMeow lane programs. They contain application-specific evidence and are already valuable:

- `bin/mmeow-test`
- `bin/mmeow-integration-test`
- `bin/mmeow-e2e-pack`
- `bin/mmeow-browser-e2e`
- `bin/mmeow-db-test`
- `bin/mmeow-pgbouncer-rls-test`
- `bin/mmeow-backup-restore-test`
- `bin/mmeow-smoke-image`
- `bin/mmeow-check-pooling`

`hey_pipeline` orchestrates these programs; it does not absorb application semantics.

## What changes

1. Copy `examples/mmeow.pipeline.json` to MMeow's repository root as `hey-pipeline.json` and review the resource groups against the actual workstation.
2. Replace the orchestration body of `bin/mmeow-gate` with a compatibility wrapper that executes `hey-pipeline run hey-pipeline.json`. Preserve `--fast` by translating it to `--profile fast`.
3. Run `hey-pipeline run hey-pipeline.json --profile full` locally. Independent web/config lanes race; DB/Hey/Docker lanes serialize only where their declared resource groups conflict.
4. For a release candidate, commit everything, obtain `candidate=$(git rev-parse HEAD)`, and run `hey-pipeline run hey-pipeline.json --release --sha "$candidate"`.
5. Verify the resulting `.hey/pipeline/$candidate.json` using `hey-pipeline verify-receipt ... --release --sha "$candidate"` before deployment.
6. Delete the stale GitHub-private-runner release policy (`infra/ci/production-required-checks.txt` and the GitHub-check-run-based `bin/mmeow-release-readiness`) after the local receipt path is accepted and its tests have been replaced with receipt-policy tests.
7. Update `infra/ci/README.md`: production authority is the local exact-SHA receipt, not a self-hosted GitHub Actions runner.

## GitHub after migration

Keep GitHub jobs only where they provide useful independent evidence without private cross-repository credentials. MMeow's current `security.yml` is a good candidate: secret-history scanning, dependency audit, ShellCheck, IaC scanning, and image vulnerability scanning can remain supplementary. GitHub green is not production authority.

## Why the manifest is not a literal translation

The old `mmeow-gate` is sequential. The generic manifest deliberately permits independent lanes to race. Resource groups prevent concurrent heavyweight jobs from contending for the compiler, Docker daemon, or database. This preserves MMeow's fail-closed behavior while avoiding unnecessary single-tracking.

# hey_pipeline

Local-first, fail-closed CI/CD orchestration and exact release receipts for Hey
projects.

The authoritative gate for a Hey project runs on a machine that has the Hey
toolchain — not on a hosted CI service that cannot. `hey_pipeline` is the runner
for that gate: one manifest per project, a resource-bounded parallel scheduler,
and structured receipts bound to an exact clean Git SHA.

```sh
bin/hey-pipeline run hey-pipeline.json              # default profile
bin/hey-pipeline run hey-pipeline.json --profile fast
bin/hey-pipeline run hey-pipeline.json --list
bin/hey-pipeline run hey-pipeline.json --release --sha <40-char-sha>
```

## Why local-first

Hosted CI is treated as **optional supplementary evidence**, never as release
approval. Two reasons, both learned rather than assumed:

- A hosted runner that cannot install the private toolchain either skips the
  lane that matters or fails for reasons unrelated to the code. A skipped lane is
  not evidence.
- Hosted CI stops for reasons that have nothing to do with correctness. MMeoww's
  GitHub workflows failed for months with *"recent account payments have
  failed"* — the jobs never started, so a red badge said nothing about the code
  and a green one would have said just as little.

## Fail-closed by construction

- Refuses to run outside a git repository, because a receipt with no SHA is not
  a receipt.
- A release receipt requires a CLEAN tree at an exact 40-character SHA.
- A missing prerequisite is a FAILURE, never a silent skip. A conditional lane
  that skips is not a gate.

See `docs/DESIGN.md` for the scheduler and receipt model, `docs/MANIFEST.md` for
the manifest schema, and `docs/MMEOW_RETROFIT.md` for a worked adoption.

# Testing hey_pipeline

```sh
bin/check          # the packager gate: docs, manifest, then bin/package-check
bin/package-check  # this package's own gate
```

`bin/package-check` proves the RUNNER, not just that it starts:

1. `specs/runner_spec.py` — scheduling, profiles, prerequisite handling.
2. `hey-pipeline --version`.
3. It RUNS a minimal manifest in a throwaway git repo.
4. It requires the runner to FAIL on a deliberately red lane.

Step 4 is the one that matters. A runner that reports success for a failing lane
is worse than no runner: every project depending on it is then green by
construction. Steps 1–3 all pass against such a runner.

Step 3 creates a real git repo because the runner refuses to run outside one —
receipts bind to a SHA. The self-check satisfies that requirement rather than
routing around it.

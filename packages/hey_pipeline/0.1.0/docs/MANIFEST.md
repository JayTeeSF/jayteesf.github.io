# Pipeline manifest

`hey-pipeline.json` is data, not executable CI configuration. The runner uses JSON so the same manifest is readable by Hey, Python, shell tooling, agents, and future UIs without evaluating arbitrary configuration code.

## Top level

- `manifest_version`: currently `1`.
- `name`: human-readable pipeline name.
- `default_profile`: optional profile used when `--profile` is omitted.
- `max_parallel`: maximum simultaneously running lanes.
- `resources`: map of resource-group name to capacity. Unspecified groups default to capacity 1.
- `profiles`: named lane-selection rules using `include`, `exclude`, `include_tags`, and `exclude_tags`. Dependencies of selected lanes are always included.
- `lanes`: ordered lane definitions.

## Lane fields

Every lane requires `name` and exactly one of:

- `command`: argv array, preferred because it does not invoke a shell; or
- `shell`: explicit Bash program for compound commands/pipelines.

Optional fields:

- `needs`: dependency lane names. A failed dependency BLOCKS the lane and the pipeline remains RED.
- `requires`: executables that must exist on `PATH`. Missing tools FAIL; they never silently skip.
- `cwd`: working directory relative to the repository root.
- `env`: lane-specific environment additions.
- `timeout_seconds`: hard timeout.
- `resources`: exclusive/capacity-bounded resource groups, e.g. `compiler-heavy`, `docker-heavy`, `database-exclusive`.
- `tags`: profile-selection tags such as `fast`, `slow`, `security`, `release`.
- `expect`: `success` (default), `failure` for a negative control, or `{ "exit_codes": [23] }`.

Independent lanes race. Dependencies and resource capacities are the only serialization mechanism.

## Release mode

`hey-pipeline run --release --sha <40-char-sha>` refuses a dirty tree and refuses a checkout whose HEAD differs from the supplied SHA. A GREEN release writes `.hey/pipeline/<sha>.json`. Development runs may be dirty and write `.hey/pipeline/latest.json`.

`hey-pipeline verify-receipt .hey/pipeline/<sha>.json --release --sha <sha>` fails closed unless the receipt is GREEN, clean, release-bound, exact-SHA, and every lane is PASS.

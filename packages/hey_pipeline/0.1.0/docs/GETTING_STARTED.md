# Getting started

## 1. Add a manifest

`hey-pipeline.json` at the project root:

```json
{
  "manifest_version": 1,
  "name": "myapp",
  "default_profile": "full",
  "max_parallel": 4,
  "resources": {"database": 1},
  "profiles": {
    "full": {},
    "fast": {"exclude_tags": ["slow"]}
  },
  "lanes": [
    {"name": "unit",  "command": ["bin/test"]},
    {"name": "typecheck", "command": ["npm", "run", "typecheck"]},
    {"name": "db", "command": ["bin/db-test"], "resources": ["database"], "tags": ["slow"]}
  ]
}
```

## 2. Add a thin driver

```sh
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
runner="${HEY_PIPELINE_ROOT:-$HOME/dev/hey_pipeline}/bin/hey-pipeline"
[ -x "$runner" ] || { echo "set HEY_PIPELINE_ROOT to a hey_pipeline checkout" >&2; exit 2; }
exec "$runner" run "$root/hey-pipeline.json" "$@"
```

## 3. Run it

```sh
bin/pipeline --list
bin/pipeline --profile fast
bin/pipeline
```

## 4. Turn off hosted CI

Move `.github/workflows/*.yml` to `.github/workflows-disabled/` and say in the
README where the authoritative gate lives. Do not leave a workflow that cannot
pass: a permanently red badge trains everyone to ignore the badge.

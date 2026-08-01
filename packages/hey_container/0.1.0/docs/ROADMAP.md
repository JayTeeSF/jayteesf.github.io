# Roadmap

## 0.1.0 — current

Dockerfile generation for `development`, `test`, and one image shared by
`staging` and `production`. Two-stage build with no source in the runtime
stage. `.dockerignore` covering `.git`, `.env*`, `*.key`. Health endpoint.
Fail-closed refusal of `bind(`-bearing apps, with `--allow-bind`.

Every gate has been seen red on purpose, and one sabotage exposed a real
hole: the shell identity check stayed green because the CLI bypassed
`render()`.

## Not done, and honest about it

- **No compiled-lane image built end to end.** The toolchain works
  in-container; a full build under x86 emulation exceeded 35 minutes on a
  2-CPU VM. Settled by a native amd64 host, not by more patience.
- **No arm64 target** — the trunk ships no `linux-arm64` Hey distribution.
- **No benchmark** behind the interpreted default. The tradeoff is
  argued, not measured, and should not be quoted as though it were.
- **`generic_cagents` not containerised** — version skew against its
  pinned packages, and it has no health route.

## Next

1. Delete the `bind(` refusal when the compiled lane carries a bound
   handler. One string, one stage selection; nothing else should move.
2. Compiled-lane image on a native amd64 host, with a request-latency
   number so the lane default stops being an argument.
3. Measure the runtime image against a 1 GB instance — the cheapest
   hosting option turns on whether the binary plus a database fit.

# hey_container

Package a `hey_web` application into a Docker image.

```sh
hey-container dockerfile --env production --out Dockerfile
hey-container dockerfile --env development --out Dockerfile.dev
```

## The environment model

`HEY_ENV` selects one of four environments, and they are **not** four
images:

| environment | image |
|---|---|
| `development` | its own — source mounted, fast rebuild, dev tooling present |
| `test` | its own — suite runnable, disposable database |
| `staging` | **shared with production, byte-identical** |
| `production` | **shared with staging, byte-identical** |

Staging and production differ **only at run time**, by `HEY_ENV` and
injected configuration. That is the whole point: staging exists to
exercise *the artifact that will go to production*, and an image built
separately for staging is a different artifact that happens to look
similar. `bin/check` asserts the two renders are byte-identical, so
building them apart is a gate failure rather than a habit.

## What ships, and what must not

**This depends on the lane, and the current default is the worse one.**

In the **compiled** lane the runtime stage receives the native binary and
runtime assets only (`COPY --from=compile /out/app`) — no `.hey` source,
no compiler, no package cache.

In the **interpreted** lane the runtime stage necessarily carries the
source (`COPY --from=deps /src /app`), because the interpreter has
nothing to run without it.

**The default lane is interpreted**, because `bind()` does not survive
the compiled lane — so the image this package produces by default
**ships your application source to the server**. That is a real cost of
the bind restriction and not a design preference: `elders_prayer_app`'s
hand-written Dockerfile refuses source in its runtime image precisely
because "nothing that could rebuild or reveal the application" belongs
there, and this package cannot match that until the compiled lane works.

Set `--lane compiled` if your app avoids `bind()`. Fixing the compiled
lane makes this go away for everyone.

`.dockerignore` excludes `.git`, `.env*` and `*.key`. `bin/check` asserts
that, because an exclusion list nobody tests is a comment.

## Health check

The image exposes a health endpoint returning **200** with a body. Both
halves matter, and the reason is a defect this package was built
alongside: a `hey_web` handler that FAILED used to return **200 with an
empty body**, so an orchestrator gating on status alone promoted a dead
app as healthy and never rolled back. Assert the **body**, not the code.

Three known failure modes, measured — see
`elders_prayer_app/kamal_health_check_is_broken.md` for the full table:

1. an error in the handler's return expression → 200, 0 bytes
2. a handler arity mismatch → 200, 0 bytes
3. **an error in a non-return expression → 200, CORRECT body** — compiled
   only; interpreted it aborts

Mode 3 is invisible to a body assertion. `Web.recover_errors()` turns
modes 1 and 3 into real 500s in-band; a log assertion for `hey error:`
catches all three after the fact. Use both.

## Deploying with Kamal

This package builds images; it does not deploy. Kamal drives them well —
that was evaluated rather than assumed, and the evaluation says adopt
Kamal rather than build a Hey-specific deployer.

Four things learned deploying a real Hey app to a real box:

- **`builder: driver: docker`**, NOT Kamal's default `docker-container`.
  The default runs its own buildx instance with a separate image store,
  so a `FROM hey-toolchain:...` base built locally is invisible to it and
  it tries Docker Hub instead.
- **`builder: arch` must match the server**, and must change in the SAME
  commit as any server change. Mismatched, the deploy ships a binary the
  host cannot execute.
- **Use a native Kamal, not the containerised one**, on macOS: the SSH
  agent socket cannot be bind-mounted from macOS into a Linux container,
  so Kamal falls back to password auth and dies on `Not a tty`.
- **One source of truth for the public hostname.** Certificate, DNS
  record and post-deploy check must read the same file, or they will
  eventually disagree about which host this is.

## The compiled-lane restriction

Handlers built with `bind(Controller.action, state)` **do not work
compiled** — a callable degrades to its name string crossing into a
stdlib module, so dispatch cannot find it. The build refuses a
`bind(`-bearing app rather than shipping an image that fails at run time;
`--allow-bind` overrides, loudly.

Reach boot-time state by **name** instead: `Jobs.define` with a known
name returns the existing pool, so a handler can find it with no bind and
no ambient global. When the compiled-lane fix lands, the refusal is
deleted and nothing else changes — the lane is one `ARG HEY_LANE`
selecting a final stage.

## Not built

No compiled-lane image has been produced end to end (the toolchain works
in-container; a full build under x86 emulation exceeded 35 minutes on a
2-CPU VM and wants a native amd64 host). No arm64 target — the trunk
ships no `linux-arm64` Hey distribution. No benchmark backs the
interpreted default; the tradeoff is argued, not measured.

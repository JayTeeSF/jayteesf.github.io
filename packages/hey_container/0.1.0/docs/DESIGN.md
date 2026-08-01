# Design

## One decision drives the rest: staging and production are one image

The unit of deployment is an **image**, and the thing you want confidence
in is *that image*. If staging builds its own, staging tests an artifact
that merely resembles what production runs — same source, different
build, different moment, possibly a different base layer.

So `render('staging')` and `render('production')` produce **byte-identical
output**, and `bin/check` asserts it. Environment enters at run time
through `HEY_ENV` and injected configuration, never at build time.

`development` and `test` are genuinely different images, because they are
genuinely different: dev mounts source and wants a toolchain, test wants a
disposable database and the suite. Pretending those are one image would be
the mirror of the mistake above.

## Two stages, and the second gets no source

A Hey app compiles to a native binary, so a COMPILED runtime stage needs
the binary and runtime assets — nothing else, and that is what it gets.
The build stage holds the compiler, the `.hey` sources and the package
cache; only `/out/app` is copied forward.

The build stage does use `COPY . .`, which is correct there — it is the
stage whose whole job is to hold the source.

**The interpreted runtime stage is the exception, and it is the current
default.** An interpreter needs source, so that stage copies `/src` into
the image. Every argument above for keeping source out of the runtime
still applies; the lane simply cannot honour it. This is a consequence of
`bind()` not surviving the compiled lane, and it is the strongest
practical argument for fixing that — it is not a tradeoff this package
chose.

## The lane is a build argument, not a fork

Interpreted and compiled runtimes are both emitted; `ARG HEY_LANE`
selects the final stage. That is more machinery than the current default
needs — today `bind()` does not survive the compiled lane, so interpreted
is the working choice — but it means the eventual fix **deletes a
refusal and flips one string** instead of forcing a redesign. Building
for a restriction as though it were permanent is how a workaround becomes
an architecture.

## Refuse rather than ship something that fails later

A `bind(`-bearing app cannot run compiled. The build could warn and
proceed; it refuses instead, because the failure it would otherwise
produce is a well-formed HTTP 200 with an empty body — indistinguishable
from success to every health check that reads status codes. A refusal at
build time is recoverable in the minute you see it. That failure is
discovered in production by whoever notices the app is doing nothing.

`--allow-bind` exists for someone who knows better than this package, and
says so loudly when used.

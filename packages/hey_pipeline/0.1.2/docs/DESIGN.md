# Design

## The manifest is the contract

A project declares LANES. A lane is a name plus a command, optionally with
`tags`, `requires` (prerequisite tools) and `resources` (mutual-exclusion
groups). The runner owns scheduling; the project owns what a lane means.

That split is deliberate. Generic orchestration must not absorb project-specific
test semantics — a runner that knows what "the database lane" means has become
part of the application.

## Scheduling

Independent lanes race. `resources` serialises only genuine contention — a
single database, a Docker daemon, an exclusive file lock — so that expensive
shared resources do not single-track the cheap checks that could have run in
parallel.

`max_parallel` bounds total concurrency. Resource groups bound specific
contention. Both are needed: without the second, a machine with spare cores
still deadlocks on one Postgres; without the first, a hundred cheap lanes
thrash.

## Prerequisites fail, they do not skip

`requires` names tools a lane needs. A missing tool FAILS the lane. This is the
single most important behavioural choice in the runner:

> A conditional CI job that skips is not a gate.

A skipping lane produces a green run that proves nothing, and it does it most
reliably on the machine least equipped to run the check — which is exactly the
machine you most wanted to hear from.

## Receipts

Every run emits a structured receipt: lanes, statuses, durations, and the Git
SHA. A `--release` receipt additionally requires a CLEAN tree and an exact
40-character SHA, and records the manifest hash, so a receipt cannot be
transplanted onto a different manifest or a dirty working tree.

The receipt is the artifact a release gate reads. It replaces polling a hosted
provider's check-run API, which requires a token, network access, and a
provider that is currently billing-solvent.

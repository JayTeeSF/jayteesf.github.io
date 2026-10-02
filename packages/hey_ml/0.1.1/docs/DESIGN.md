# hey_ml design

## Goal

Give ordinary engineering software a cheap learned decision layer before it
escalates to an LLM agent.

The package is not an LLM replacement. It learns repeated decisions for which
the inputs can be represented as bounded features and the outcome can be scored.

Typical loop:

```text
state -> features -> rank deterministic actions -> execute one -> reward -> learn
```

Examples include choosing which diagnostic to run, ordering tests, selecting a
retry strategy, picking a parser/algorithm, routing work, prioritizing findings,
and deciding whether a problem is uncertain enough to escalate to an agent.

## Why start below neural networks

For small engineering decision spaces, an online linear model or bandit can
train in constant bounded memory and score in O(features * actions). There is no
GPU, tokenization, generation, prompt, model server, or network round trip.

A tiny neural network should only replace this baseline when measurements show
that nonlinear interactions materially improve decisions.

## Model state

All public model values are immutable Hey records and arrays. Learning returns a
new model. This keeps the package compatible with normal Hey ownership rules and
makes state straightforward to place inside an actor or serialize at an
application boundary.

## Deterministic exploration

Both Bandit and Policy use an optimistic bonus:

```text
exploration / (observations_for_action + 1)
```

This is intentionally simpler than stochastic epsilon-greedy exploration.
Untried actions receive a larger bonus, ties are stable, and identical state
produces identical decisions.

## Performance boundary

The v0 implementation uses ordinary Hey arrays. Benchmark that first.

If profiling shows numeric storage dominates, the correct next move is not a C
ML library hidden inside this package. Instead, add the smallest generally useful
numeric primitive to Hey itself (for example contiguous f32/f64 storage, SIMD
dot/reduce, or native exp/log/sqrt), then consume it here.

That preserves the boundary:

```text
Hey runtime/stdlib -> general numeric capability
hey_ml             -> models, training, policies
application        -> features, actions, rewards, persistence
```

## Service architecture

The library is the primary product. A service is an adapter.

A long-lived service should put Policy state in one owning actor and expose
request/reply through `stdlib:Web` or `hey_web`:

```text
POST /v1/choose
POST /v1/observe
GET  /v1/models/:name
PUT  /v1/models/:name
```

That adapter belongs in a later slice after the embedded API is compiled,
benchmarked, and stable.

# Roadmap

## 0.1 - baseline

- immutable numeric vectors;
- online linear reward predictor;
- deterministic bandit;
- contextual action policy;
- specs and an engineering-tool example.

## 0.2 - measurement and persistence

- benchmark policy scoring/update throughput and allocation;
- model JSON encoding/decoding with schema/version checks;
- normalization and feature hashing;
- reward helpers for success, latency, and cost;
- actor-owned model registry;
- optional hey_web service.

## 0.3 - richer CPU models

Only after baseline measurements:

- logistic classification;
- multiclass softmax;
- tiny MLP with mini-batch training;
- generated/manual backward pass;
- Adam or momentum SGD;
- calibrated confidence and explicit escalation thresholds.

## Runtime candidates

Promote functionality into Hey itself only when generally useful and proven by
profiles:

- contiguous f32/f64 vectors;
- vectorized dot, axpy, reductions;
- SIMD;
- native exp/log/sqrt;
- matrix kernels.

No GPU is required for the package's core mission.

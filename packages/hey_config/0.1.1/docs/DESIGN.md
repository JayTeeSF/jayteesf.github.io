# Design

`hey_config` owns target-neutral configuration *contracts*: committed
defaults, per-environment overlays, typed validation, and references to
external secret providers. It does not read process environments, choose a
secrets backend, or contain application-specific values. Those execution
APIs need stable Hey-core filesystem/environment/schema support first.

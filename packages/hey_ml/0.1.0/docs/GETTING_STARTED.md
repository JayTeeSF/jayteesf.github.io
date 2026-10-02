# Getting started

Create a policy over a fixed action set and feature count, choose an action,
then report the observed reward:

```hey
import 'pkg:hey_ml@0.1.0/policy'

let policy = Policy.new(['retry', 'inspect'], 2, 0.02, 0.0001, 0.25)
let decision = Policy.choose(policy, [3.0, 1.0])
let learned = Policy.learn_choice(policy, decision, [3.0, 1.0], 1.0)
```

The package is CPU-only and requires no GPU, LLM, tokenization, or model server.

# Native actor references

These programs implement the logical workloads in `benchmarks/go-reference`
and `benchmarks/hey/actors`: ring, pairs, fan-in, sleeping actors and actor
creation. They print the same operation counts and metric names. Fan-in also
checks the payload sum in these three references; the existing Hey and Go
workloads check completion counts only.

The runtime semantics differ. Erlang and Pony have unbounded mailboxes. Pony
uses its ordinary muting/backpressure policy. Tokio uses bounded channels
(1024 entries for fan-in and 16 for ring/pairs) and its normal cooperative
budget. State these differences with every comparison.

Application timing windows also differ. Hey fan-in precreates and configures
its producers before starting its timer; Go, Erlang and Tokio create producers
inside that interval, and Pony starts just before constructing its collector.
The eight-producer setup cost is included in those reference rates. Actor
creation includes the handle collection allocation in Pony, Go and Tokio;
Erlang builds its PID list during creation, while Hey grows an initially empty
array. Pony's `total_ms` ends when its completion actor handles the last stop
notification; other reference totals wait for their tasks/processes, and Hey
reports separate stop-send and join phases. Compare `spawns_per_sec` for the
creation interval, and use whole-process CPU/wall measurements for the entire
lifecycle. Do not rank unlike phase totals as an identical latency measure.

Build into an explicit output directory:

```sh
erlc -Werror -o "$OUT/erlang" benchmarks/actor-reference/erlang/actor_ref.erl
ponyc -o "$OUT/pony" -b pony-actors benchmarks/actor-reference/pony
cargo build --release --locked --manifest-path benchmarks/actor-reference/tokio/Cargo.toml --target-dir "$OUT/tokio"
```

Invoke a case with eight scheduler workers:

```sh
erl +S 8:8 -noshell -pa "$OUT/erlang" -s actor_ref main -extra fanin 8 1000000
"$OUT/pony/pony-actors" fanin 8 1000000 --ponythreads 8
TOKIO_WORKER_THREADS=8 "$OUT/tokio/release/hey-actor-tokio-reference" fanin 8 1000000
```

Other arguments are `ring N H`, `pairs P H`, `sleepers N MS` and
`spawn_idle N`. Each operand must be in `1..1000000`; these are bounded
benchmark fixtures, not arbitrary-size input processors. The bound prevents
signed hop-token conversion and count/checksum overflow in the supported
64-bit native lanes, and is checked before actors/tasks are created.
Require a successful process exit as well as matching output:
a printed metric does not prove that the actor graph terminated.

Use `tools/actor_bench/efficiency_scorecard.py` with a prebuilt-command plan to
capture native CPU, RSS and Darwin footprint, output controls, executable
hashes, warmup and every measured repetition. Record source hashes, the Rust
lockfile, Erlang BEAM hash, tool versions and channel/mailbox semantics.
Keep absent CAF/Akka implementations and unmeasured 1BRC cases visible.
Small correctness smoke runs do not establish runtime rankings or qualify a
new Hey compiler release.

# TESTING

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
bin/check          # behaviour
bin/package-check  # packaging
```

## The gates

| # | gate | what it would catch |
|---|---|---|
| 1 | version drift | a bump that forgets the in-source literal |
| 1b | knob coverage | an option the code reads and the README does not document |
| 2 | 7 specs, interpreter lane | every behavioural claim |
| 2b | the same 7 specs, COMPILED | a behavioural claim that holds only on one lane |
| 3 | two-lane receipt | interpreter/compiled divergence, in either direction |
| 4 | real `hey_record` file store, two processes | a "persistent" layer that is not |
| 5 | real `hey_record` SQL store over real `hey_sqlite3` | invalidation that never reaches the database |

Gates 4 and 5 need sibling checkouts and **skip loudly** to stderr when they
are absent. A silent skip is a gate that cannot fail.

Gate 5 needs the native library:

```sh
(cd ../hey_sqlite3 && bin/build-native --out /tmp/hey_sqlite3_lib)
export HEY_SQLITE3_LIBRARY=/tmp/hey_sqlite3_lib/libhey_sqlite3.dylib
```

## Why the two-lane receipt is a gate and not a nicety

`specs/*.hey` run on the interpreter only. This package has measured the two
lanes disagreeing in **both directions** on its own source:

- `layer.layer` — a field named the same as the variable holding the record —
  ran correctly on the interpreter and could not be lowered at all;
- a local variable named `read` shadowed the `read` builtin and crashed
  *stdlib Files* on the interpreter, while the compiled binary was correct.

- a `nil` returned from a dynamically invoked callable arrives as the
  integer **0** in the compiled lane and as `nil` on the interpreter, so a
  compute meaning "no value" cached a real 0 in compiled builds and cached
  nothing on the interpreter.

Neither of the first two is visible from one lane. `tools/lane_receipt.hey` therefore
exercises the whole surface, is built with `heyc build` AND interpreted, and
`bin/check` diffs the two stdouts byte for byte. Exit codes are not the
evidence: the line count and an end marker are asserted too, because an
empty run exits 0.

## Every gate has been seen RED

Each defect below was injected **alone**, into a fresh copy of the tree, and
the named gate was confirmed to fail. A gate never seen fail is not evidence.

| injected defect | gate that caught it |
|---|---|
| write-back disabled | `chain_spec` |
| `forget` stops at layer 0 | `invalidation_spec` |
| expiry never expires | `expiry_spec` |
| sensitive guard removed | `sensitive_spec`, and gate 4's on-disk check |
| namespace dropped from the key | `namespace_spec` |
| layer error folded into a miss | `failure_spec` |
| write-back EXTENDS expiry instead of clamping | `expiry_spec` |
| `compute` called twice | `chain_spec` |
| `layer.layer` reintroduced | gate 3 (build fails) |
| `forget` skips store layers | gate 3/`failure_spec` |
| persisted file deleted between the two processes | gate 4 — **and the run still exited 0** |
| a row left in the database | gate 5 |
| `nil` as the absent-value signal | gate 2b — **found for real, not injected** |

The last two are the reason gates 4 and 5 assert VALUES (`compute:` absent,
the persisted value present, `select count(*)` = 0) rather than exit codes.

### Gate 2b found a real defect the receipt missed

`heyc build` on a spec file compiles and runs its `program` block but does
**not** enforce the `spec ... expect stdout` block — only `heyc <spec>
--test` does, and that is the interpreter. So a compiled spec binary can
print anything and still exit 0.

Gate 2b builds every spec, runs it, and compares its stdout to the spec's
own declared expectation decoded from the source. The first time it ran it
went red on `failure_spec`, on four lines:

    interpreter: ... true  false  not_cached  false
    compiled:    ... true  true   ok          true

`computed == nil` was false in the compiled lane, so a compute meaning "no
value" got its result cached. The absent-value signal is now
`HeyCache.no_value()`, a record, which round-trips identically in both
lanes.

## Test doubles

`specs/support/store_double.hey` is a file-backed double implementing the
three-callable binding contract, so specs stay self-contained. It is not a
second file store: the REAL `hey_record` store is what gates 4 and 5 drive.
`StoreDouble.failing_on(handle, key)` makes one key fail hard, which is how
`failure_spec` proves a broken layer is reported rather than treated as a
miss.

# Testing

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
bin/check
bin/release
unzip -tq dist/hey_ios_tv-0.1.0.zip
```

Platform packages separate structural/plan receipts from simulator,
physical-device, signing, and store evidence. Never convert a structural
result into a native-host claim.

Package release metadata is processed by compiled Hey through hey_packager >= 0.1.11; Python is not required.

`specs/log_privacy_spec.sh` extracts all production native logging statements
and executes those exact calls in a Foundation host with synthetic device,
event, URL, query and error-description values. Captured stdout/stderr must
exclude every sensitive sentinel and all URL schemes while emitting each
relevant log category. The spec also compiles `HEY_SCENE_V2` against tvOS.
The shipped 0.4.26 statements fail this output control. Physical-device
log/lifecycle acceptance remains separate from this host executable gate.

`scene_recovery_spec.sh` runs the production legacy fetch, parser, timer and
bootstrap-recovery methods in a Foundation host against a disposable local HTTP
fixture. The privacy-only baseline blanks its displayed title and cancels its
poll timer after malformed HTTP200; the recovery patch retains last-good state
and its real NSTimer, then accepts a later good response without relaunch.
UIKit drawing is represented by the first text widget in this host test.
`scene_poll_policy_spec.sh` checks supported scene families, structural refusals,
exact retry deadlines/cap/reset and bounded long-outage counters. It can also
validate synthetic scene JSON files supplied as arguments. A fixed-cadence
mutation fails the deterministic backoff control.

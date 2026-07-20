# Design

`hey_party` owns reusable multiplayer product porcelain while remaining
independent of native television platforms.

## Reused rather than rebuilt

- `hey_tv 0.1.0` supplies public-display and join-payload values.
- `hey_web 0.1.6` supplies reusable application-server planning, blocking
  serving conveniences, and Hey-native HTTP client behavior above stdlib Web.
- `hey_mobile 0.1.3` supplies cross-platform controller lifecycle,
  navigation/enrollment, accessibility, and test-state conventions.
- Hey stdlib supplies Web/HTTP/Crypto/JSON/Jobs/Process foundations.
- `hey_packager` owns immutable release and publication machinery.

## This package owns

- Room protocol, ordering, reconnect, heartbeat, expiration, and backpressure.
- Host/player/spectator lobby policy and rematches.
- Public TV versus private player projections.
- Deterministic game reducers for Dictionary Bluff, Categories Clash, Ghost,
  Spades, and Bid Whist.
- A starter application generator.

It deliberately has no dependency on `hey_ios_tv` or `hey_android_tv`. A
consuming application selects either or both native public-display adapters.
Applications own branding, persistence, credentials, prompts, moderation
policy, deployment, and content licenses.

## Build and dependency baseline

- `hey_packager 0.1.3` is local build/release tooling, not a runtime package dependency.
- `hey_tv 0.1.0`
- `hey_web 0.1.6`
- `hey_mobile 0.1.3`

Dependencies are resolved from the immutable registry and project lock, never from sibling source checkouts.

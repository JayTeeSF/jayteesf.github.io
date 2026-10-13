# Design

The design of this package is stated in full in two documents that predate
this file and remain authoritative:

- **`docs/humans/north-star.md`** - the goal: ONE pure Hey package defining
  byte-stable VSS protocol identity and validation, so that every client
  agrees on the same bytes without agreeing on anything else.
- **`docs/humans/hey-extraction.md`** - what was pulled out of the wider VSS
  work into this package, and why those pieces and not others.

The boundary is the design decision worth repeating here: `vss_sync` is
PURE. It owns protocol identity, route construction, validation and
deterministic conflict selection. It owns no transport, no storage, no key
material and no product policy. Anything that has to talk to a network, a
disk, a keychain or a user belongs to the consumer, which is what lets the
same package serve several clients without dragging their choices along.

This file exists because hey-packager requires `docs/DESIGN.md` by name; it
is a pointer, not a second source of truth. Prefer the two documents above.

# Roadmap

## Now

- Manifest-driven lanes, resource-bounded parallel scheduling, profiles.
- Fail-closed prerequisites and exact-SHA release receipts.

## Next

- **Containerised lanes.** A `container` key on a lane, so a lane runs inside a
  named image rather than on the host. This is what makes a local gate
  reproducible across machines instead of merely local, and it is the difference
  between "it passed here" and "it passes."
- **Receipt verification as a first-class command.** `hey-pipeline verify
  <receipt> --sha <sha> --require <lane>...` so a release gate does not have to
  parse the receipt itself.

## Not planned

- Absorbing project-specific test semantics. A lane's meaning belongs to the
  project.
- Requiring a hosted provider's API for the authoritative gate. Hosted checks
  remain optional supplementary evidence.

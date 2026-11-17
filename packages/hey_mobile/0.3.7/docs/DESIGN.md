# Design

`hey_mobile` keeps its public Hey modules and package-specific tests in this repository. Generic package validation, deterministic release construction, checksums, documentation publication, source ZIP creation, and immutable registry publication are delegated to `hey_packager`.

Package behavior remains independent of the release tool: `bin/package-check` exercises this package, while `bin/check` composes those tests with common manifest and documentation controls.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.

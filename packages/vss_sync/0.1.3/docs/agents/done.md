# Done

## v0.1.2

- Moved the `main` module to the package root (`main.hey`). A consumer import `pkg:vss_sync@VERSION/main` resolves to `<package>/main.hey`, so 0.1.1 (`src/main.hey`) could not be imported at all; the VSS server build failed with `import not found`.
- Adopted hey_packager tooling: `bin/check`, `bin/bump`, `bin/release`, `bin/publish`, `bin/update_packages`. `bin/package-check` runs the spec and refuses a module that a `pkg:` import cannot reach.

## v0.1.1

- Documented native iOS, future Android, and browser consumers of one pure protocol package.
- Added canonical source handoff instructions for future LLM work.

## v0.1.0

- Added pure vss-sync-3 identities, routes, ciphertext validation, recovery validation, and conflict selection.
- Added package verification, immutable package archive, and complete LLM source handoff.

# Design

## Boundary

Hey core owns manifest validation, deterministic package archives, release
metadata, integrity verification, installation, and lockfiles.

`hey_packager` owns author-facing policy:

- standard package repository controls;
- required public documentation;
- source handoff ZIPs;
- release checksums;
- website registry layout;
- optional Git commit after immutable publication.

The default registry path is user policy and therefore does not belong in the
language runtime or standard library.

## Immutability

Publication refuses to replace `NAME/VERSION`. Fixes require a new version.
The command commits only the new package-version directory and never pushes.

## Packaging boundary

`bin/package-check` owns package-specific behavior. `hey_packager` owns manifest verification, required documentation, execution of `docs/examples/basic.hey`, release artifacts, checksums, and registry publication. This prevents each package from reimplementing release policy.

Packages extend the shared commands only through `bin/package-check`, `hey-version-files` and `bin/package-bump`. The vendored `bin/` copies stay byte-identical, so one fix reaches every package by copying files.

## Compared with the v3 home-directory tools (0.1.8)

Six packages used `~/bin/hey-bump-package`, `~/bin/hey-update-packages` and a
hand-written `bin/check`, installed by `hey-install-package-tools` (v3, Ruby).
The comparison that shaped 0.1.8:

| Behaviour | v3 tools | hey_packager 0.1.7 | hey_packager 0.1.8 |
| --- | --- | --- | --- |
| Version validation | x.y.z with optional `-pre`/`+build`; VERSION must equal the manifest; no check that the version rises | x.y.z; `bin/bump . X` failed with "version must be major.minor.patch" | strict x.y.z without leading zeros; must be higher; must not already be published; clear error for a stray `.` |
| Which files change | VERSION, manifest (re-serialised), and *guessed* lines anywhere in tracked files whose text mentions "version", "release", the package name... | VERSION and manifest only | VERSION, manifest (in place), every declared copy in `hey-version-files`, then `bin/package-bump OLD NEW` |
| Read-back | VERSION/manifest, and a heuristic scan of `bin/` | VERSION/manifest | VERSION/manifest and every declared copy (old gone, new present); restores on failure; lists undeclared mentions |
| False rewrites | yes: a dependency or a roadmap line that shares the number is rewritten if its line says "version" or "release" | none | none: whole-token match, scoped by a marker |
| Dry run | `--dry-run` counts files | none | `--dry-run` runs the real bump and the hook in a copy and prints the diff |
| Repair a hand edit | `--normalize` (guesses the stale version) | none | `--normalize STALE` (stated explicitly); `bin/check` catches the stale copy |
| Git safety | none; rewrites the tree in place | none | none needed for in-place edits; restores its own writes on failure; never commits or tags |
| Tagging | none | none | none: the immutable registry commit is the release record |
| Check before publish | n/a (no publish) | release/publish ran the shared check and `bin/package-check`, never a package's own `bin/check`; no override | the package's `bin/check`; `release --no-check`, `publish --emergency-publish-unchecked` (recorded) |
| Dependency pins and lock | exact pins to latest (could move DOWN if the local registry lacked a version); `ensure --update-lock` against a generated index; `pkg:` imports; verify; `bin/check` | none | the same steps as a hey-packager command; pins only move up; manifest edited in place |
| Module renames | runs `hey-fix-modules` first | none | not carried: a one-off stdlib rename migration, not part of refreshing pins |
| Error messages | Ruby aborts, mostly clear | terse | name the file, line and the command that fixes it |
| Portability | needs Ruby | sh; BSD-sed bug fixed in 0.1.7 with awk; bump left the manifest mode 0600 | sh, awk, python3 (already required); no sed address extensions; file modes kept |

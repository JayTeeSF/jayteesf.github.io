# hey_packager 0.1.6

Release, checksum, source-handoff, and immutable website publication porcelain for Hey packages.

The root `README.md` contains the public package overview. This documentation directory is copied intact into every registry publication by `hey_packager`.

## Release controls

```sh
bin/check
bin/release
bin/publish --no-commit
bin/source-zip
```

## Function-table headroom

```sh
bin/hey-packager function-table .
# hey-packager function-table count=3305 ceiling=4096 used=80% headroom=791 modules=1
```

Measures how many functions actually **register** — by importing the whole
stdlib plus the package's `src/*.hey` into a REPL and asking it — and compares
that against the compiler's `HEY_REPL_MAX_FUNCTIONS`.

The ceiling is **read from `$HEY_ROOT/runtime/hey_repl.c`**, never restated
here: it moved 2048 → 4096 on 2026-08-07 *without* a version-string change, so
a copied number would have gone stale silently while looking authoritative. If
that source is unreachable the command refuses rather than guessing.

Why it is a gate and not a report: before that change the function table
**printed a line and then discarded** any definition past the ceiling. Nothing
failed at that moment — the program kept loading and the omission surfaced
later, elsewhere, as an unknown function. The compiler now refuses loudly, but
only at 100%, which is too late to act on. This fails at 95% by default
(`HEY_FUNCTION_TABLE_MAX_PERCENT`), and fails closed if an import errors, since
a failed import *lowers* the count and a low count is indistinguishable from
healthy headroom.

The whole stdlib is imported deliberately. A package importing a subset today
inherits the rest the moment any dependency does, and the ceiling is global —
so the number worth gating on is the worst case, not today's.

See `GETTING_STARTED.md`, `DESIGN.md`, `TESTING.md`, and `ROADMAP.md` for package-specific guidance.

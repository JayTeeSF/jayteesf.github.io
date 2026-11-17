# Design

## The load-bearing question: where does model metadata come from?

Three shapes were possible. **Reflection** (ask the record layer what
the model looks like), **declaration** (the developer writes a small
config), **generation** (emit CRUD source the developer owns).

The answer was measured, not assumed.

### Reflection is not available

`hey_record` 0.3.0's `HeyRecordModel.define` returns
`{kind, connection, table, primary_key, timestamps, options}` — 14 lines
of source, no column list, no types, no nullability. `HeyRecord.from`
seeds `columns: []`, which is the SELECT projection rather than the
column set. `HeyRecordInfo.capabilities()` declares `associations`,
`validations` and `callbacks` all false, and the README lists *schema
dumping* under deliberate limits.

Type information exists momentarily — a developer passes it to
`HeyRecordMigration.column(name, sql_type, options)` — and that function
concatenates it into a DDL string. Nothing retains it.

### Database reflection was the first design, and it was wrong

`HeyRecord.query(connection, 'PRAGMA table_info(t)')` works. It is still
the wrong answer, and the app this package is proved against is why.

`generic_cagents` persists through `HeyRecordStore`, whose SQL table is
fixed by `hey_record` as
`(collection_name, record_id, payload LONGTEXT, ...)`. Reflecting that
yields the same five columns for every collection in the application and
renders a blob. The design would have passed every spec written against
it and been useless on the one app it had to serve.

The lesson generalises: **read the consumer before designing the
producer.** The test subject is a design input, not a validation step.

### The answer: declaration first, inference for free

`HeyAdminField` declares; `HeyAdminReflect` infers the sorted union of
the keys the returned rows actually have, primary key first; declaration
wins on conflict and inference contributes only undeclared keys.

Inference reflects the **data**, which is the only thing in this stack
carrying a shape. It is honest about what that costs — a field empty in
every sampled row is invisible, types are guessed, nothing is inferred
as required — and every inferred column is marked so the screen can say
which columns are a guess.

`generic_cagents` corroborates the choice: it already declares its own
field metadata in `Project.required_fields()`, a list of `{key, label}`
— the same shape `HeyAdminField` takes. The metadata was in the
application all along. It just was not in `hey_record`.

## Records, not callables

A source is an inert descriptor with a `kind`, dispatched on with an
`if`. The natural shape would be a record of four callables — it is what
`hey_record` itself uses for adapters — but a callable in a record that
crosses a module boundary degrades in the compiled lane, and both lanes
are an acceptance condition here. Adding a backend means editing
`source.hey`: worse for an ecosystem, better for a 0.1.0 that has to
actually run compiled.

## No nil across any internal surface

Not a style preference. `heyc build` **refuses to lower** a local
initialised from a function that can answer nil
(`cannot lower: __hir_local nil`), and refuses field access on such a
call. The interpreter accepts both, so a nil-returning helper is
invisible until the compiled lane is tried. Every helper answers a
record with a flag, or an index, or a blank sentinel.

`hey_record` states the same rule as a design principle. Here it is also
a hard compiler constraint.

## Three compiled-lane defects this package hit

All three were invisible to an interpreted run, and all three produced
plausible output rather than an error:

1. **A String parameter that only flows through `+`** is inferred as i64
   and renders as the string's **address**. A 602-character list body
   came back as `53536867584`, inside a well-formed 200 that passed
   every status assertion. Fixed structurally: the function that had it
   no longer takes the body at all — it returns a prefix and the caller
   concatenates. There is no pass-through parameter left to mis-infer,
   and it is simpler code than the version with the bug.
2. **`'' + (page.page + 1)`** answers `2` interpreted and `11` compiled;
   the inner `+` resolves as string concatenation because a record
   field's type is unknown at that point. Binding the arithmetic to a
   local first fixes it. The damage was a pager linking to page 11 of 3.
3. **A callable passed as a parameter into a route record** makes
   `Web.dispatch` answer nil. Confined to `HeyAdmin.mount`; the explicit
   route form works in both lanes.

The shape of all three is the same and it is the reason for the
byte-identical lane-agreement receipt in `bin/check-compiled`: two lanes
can both exit 0 while printing different things.

## Why the guard is a refusal and not a warning

The failure mode of every scaffolding tool that got this wrong is that
the insecure default **worked**, so nobody looked. A refusal that still
returned a route table would be a comment: the caller would combine it
and serve an open admin having read the word "refused" in a log line.
So `mount_check` returns a `Result` error and zero routes.

The `HEY_ADMIN_INSECURE=1` hatch exists because without one the first
thing anybody does at 11pm is fork the package and delete the check —
and then it is gone forever and invisible. An opt-in that is explicit,
environment-scoped (a deployment decision, not something set while
developing and carried to production in a commit), logged on every
mount, and banner'd on every screen is a better outcome than a fork.

Per-request checking as well as mount-time checking is defence in depth.
Mount-time alone checks configuration; per-request checks access, and
the thing being defended is every row in the database.

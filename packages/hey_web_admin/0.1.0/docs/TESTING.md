# Testing

```sh
bin/check            # interpreter lane
bin/check-compiled   # compiled lane + byte-identical lane agreement
tools/red-check      # mutation testing
```

`HEY_ROOT` defaults to `$HOME/dev/hey-lang-bootstrap-plan`.

## Two lanes, and why one green is not a green

The interpreter and the compiled backend are different implementations.
On this package alone they were measured disagreeing **three** times,
every one invisible to an interpreted run and every one producing
plausible output rather than an error: a body rendered as its own
address, a pager linking to page 11 of 3, and a route dispatching to
nil. See DESIGN.md.

So `bin/check-compiled` does not merely check that both lanes exit 0. It
runs `tools/lane_receipt.hey` in both and requires **byte-identical**
output, and it asserts the receipt actually rendered a document first —
otherwise two empty outputs would agree perfectly.

`mount_helper_spec` cannot compile today. It is listed in
`bin/check-compiled` with the reason rather than silently omitted; an
unlisted gap reads as coverage.

## Assert bodies, never status codes

A 200 with an empty body passes a status check, and that is exactly the
historical `hey_web` failure this ecosystem keeps re-learning. Every
assertion in every spec here is on body content, on a stored record, or
on both:

- create asserts through the **store**, so a handler that rendered the
  posted values without persisting them would still fail;
- `GET .../delete` asserts the record **still exists afterwards**, not
  merely that a confirmation rendered;
- update asserts a key the form never rendered **survived**, which is
  what catches replace-instead-of-merge.

## The guard is tested in two environments

`bin/check` runs `guard_spec` twice — once with `HEY_ADMIN_INSECURE`
unset (it must REFUSE) and once with it set to `1` (it must opt in,
loudly). The spec reads the variable and asserts the branch that must
hold. Running it in one environment would leave either the refusal or
the escape hatch — the single most dangerous line in the package —
untested.

## The real proof

`specs/generic_cagents_spec.hey` points the admin at `~/dev/generic_cagents`,
a working `hey_web` application. It **imports that app's own
`domain/project.hey`**, builds its field list from
`Project.required_fields()`, drives full CRUD over a copy of its real
record, and asserts that the app's **own validator** accepts what the
admin produced. It finishes by asserting the original file is
unmodified — the app's tree is read-only to this package.

Its escaping assertion uses that app's real
`seat_branch_pattern: "seat/<name>/<slice>"` rather than a planted
payload.

## Mutation testing

A gate that has never been seen to fail is not evidence. `tools/red-check`
applies 25 targeted mutations — escaping off, `&` escaped last, the
guard defaulted open, the authorize result ignored, GET deleting,
update replacing, the write allow-list removed, pagination ignoring the
page parameter, inference reading only the first row, `/:id` before
`/new` — and requires each to turn the relevant gate RED. A mutation
that leaves the gate green is reported as a HOLE.

It found two real holes, both closed:

- **no spec asserted the write allow-list.** Deleting it left every gate
  green. The behaviour was implemented and untested. `crud_spec` now
  asserts that a POST cannot invent a column, on create and on update.
- the first attempt at reintroducing the address-render bug was not
  actually a defect, so its "HOLE" was a false alarm. The mutation was
  corrected to reproduce the original shape exactly, and verified to
  reproduce it before being trusted as a test.

## Two guards on the specs themselves

`bin/check` greps for `check(x, a, a, ...)` — a self-comparison that
passes unconditionally. One shipped into `guard_spec` during
development and read like a real assertion. It also greps `main.hey` for
the version literal against `VERSION`, so a bump that forgets one fails
forever after.

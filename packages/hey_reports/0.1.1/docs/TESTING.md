# Testing

```sh
bin/check                      # both lanes, all gates
bin/check --interpreter-only   # faster; NOT sufficient, see below
```

## The gates

| gate | where | what it can catch |
|---|---|---|
| interpreter lane | `heyc <spec> --test` | wrong values against a recorded stdout |
| **compiled lane** | `heyc build <spec>` then run | that the binary builds and runs at all |
| **two-lane diff** | `diff` of the two stdouts | the two lanes silently disagreeing |
| exact byte count | `specs/svg_spec.hey` | any unintended change to the output |
| size / truncation | `Files.size` vs `byte_length` | a truncated write |
| XSS | `specs/svg_spec.hey` | an unescaped label reaching markup |
| **independent renderer** | `rsvg-convert` in `bin/check` | markup that only Hey thinks is SVG |
| PNG byte floor | `bin/check` | a valid but BLANK render |
| **cross-package** | `specs/tv_contract_spec.sh` | a scene `hey_tv`'s own validator rejects |

## Why both lanes, non-negotiably

The interpreter and the compiled binary have been measured disagreeing
**in both directions** on this program. During this package's
construction they disagreed FOUR times, every one of them silently:

1. `(1.0 / 4.0)` inside a string concat: `0.25` interpreted, **`0`**
   compiled.
2. `a[0].sweep + a[1].sweep + a[2].sweep` inside a string concat:
   `3600` interpreted, **`"9009001800"`** compiled — string
   concatenation instead of addition.
3. A float as a function parameter, truncated to an integer by the
   compiled lane: a bar `1013`px wide interpreted, `1012`px compiled.
4. `to_i(value + 0.5)` — a float add inside a call argument — dropped
   the `+ 0.5` when compiled.

Every one exited 0 in both lanes. Only the diff saw them. **A green in
one lane is not a green**, and a package whose `bin/check` runs only
`heyc <spec> --test` cannot see this class of defect at all.

Two rules fell out, and the source obeys both:

- **No arithmetic inside a string concatenation.** Compute into a named
  local, then concatenate.
- **No floating point.** Anywhere. See `DESIGN.md`.

## Every gate here has been seen RED on purpose

A gate that has never failed is not evidence. Each was broken
deliberately and the failure recorded.

### Escaping — deleted the `<` replacement in `escape_xml`

```
FAIL: svg renderer: a real chart, written to a real file, measured
  no_script_tag=false        (was true)
  escaped_present=false      (was true)
exit 1
```

### Truncation — wrote only the first 120 of 4947 bytes

```
source_bytes=4947
file_bytes=120
lengths_match=false
not_truncated=false
```

The point of this one is what the truncated file looks like:

```
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" role="img">
```

A perfect, well-formed opening element. "Does it start with `<svg`"
passes. `file` calls it an image. The content type is right. **Only the
length comparison catches it.**

### Two lanes — added a spec that rounds a float in a helper

```
PASS: deliberate two-lane break                    <-- the interpreter is happy
FAIL [two lanes disagree]: zzz_redgate_spec
-half=1013
+half=1012
```

The interpreter lane passed its own expectation. The diff is what
failed. That is the whole argument for the gate in one screen.

### Cross-package — emitted a `chart` widget kind hey_tv does not know

```
hey_tv_validate_ok=false
hey_tv_validate_error=[unknown widget kind: chart]
FAIL: hey_tv Television.validate_scene REJECTED the hey_reports scene
```

That gate also carries a **negative control**: it asserts hey_tv
rejects an invented kind. If hey_tv ever started accepting everything,
the gate would be proving nothing, and the control says so rather than
going quietly green.

### Independent renderer — emitted `<g>` instead of `</svg>`

```
Error reading SVG tmp/example-bar-web.svg: XML parse error:
  Error domain 1 code 77 on line 45 column 4 of data:
  Premature end of data in tag g line 45
exit 1
```

### PNG byte floor — and the gate that could not fail

The first version of this gate used one global floor of 2000 bytes. A
deliberately blanked 800×480 chart rasterised to **3523 bytes** and
sailed straight through. **The gate could not fail.** It now uses
measured per-file floors at roughly 70% of the real render, and a
blanked chart (1781 / 3523 / 12319 bytes against floors of 9000 / 13000
/ 45000) now fails.

**Its honest limit, stated because a limit you have not stated is a
limit you are hiding:** this floor catches a FULLY blank render, not a
partially broken one. Painting only the bars in the surface colour —
an invisible chart — still produced a 15789-byte PNG against a
13000-byte floor, because the axes, grid, labels and legend dominate
the file size. **That break was caught by the exact byte-count
assertion in `svg_spec.hey` instead.** Neither gate is sufficient
alone; that is why both exist.

## What is NOT tested here

- **No device ran anything.** The tvOS scene passes hey_tv's validator;
  no Apple TV rendered it. The mobile theme produces valid SVG; no
  phone displayed it. `HeyReports.surfaces()` reports `proved` for web
  and `designed` for the other two, in code, so a caller does not have
  to take a README's word for it.
- **No visual regression testing.** The PNGs were rendered and looked
  at by a human once. There is no stored baseline image.
- **No performance measurement.** No chart in this package has been
  timed.

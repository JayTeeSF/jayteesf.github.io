# Design

## The one decision everything else follows from

**The chart model and the renderer are separate, and the model knows
nothing about any surface.**

```
   Reports            ReportsTheme          ReportsSvg  --> SVG string
   (model)            (surface facts)       ReportsScene --> scene-v2 doc
   data, bounds,      canvas, safe area,
   scales, ticks,     fonts, palette
   pie angles
```

The model contains no markup, no widget, no colour and no pixel it did
not compute from a range it was handed. `specs/main_spec.hey` hands the
same chart object to three renderers and then prints the object, to
prove no renderer reached in and changed it.

This is what makes "one package, three surfaces" a real claim rather
than an assertion. What is portable is the MODEL. Renderers are not
portable, and pretending otherwise is where cross-platform UI libraries
go to die.

## Why SVG, and why nothing raster

SVG is text, so Hey emits it with no binary encoder, no DEFLATE, no font
rasteriser and no image library — none of which exist in this language.
It is vector, so one document is correct at 360px and at 1920px, which
matters more here than usual because the same report has to work on a
phone and across a room.

A pure-Hey PNG encoder needs a polygon rasteriser, a TrueType engine,
DEFLATE and a colour pipeline. That is a research project, not a package
feature, and `src/raster.hey` says so at length rather than leaving a
gap for someone to assume. Conversion, if you need it, happens outside:
either a host converter (`ReportsRaster.argv` builds the command line
and runs nothing) or the client, which already rasterises SVG natively.

## Font metrics: the package refuses the job it would do badly

Text width is **estimated** (`ReportsText.text_width`, 0.6em per
character). Real advance widths live in font files this package does not
read.

The estimate is only ever used to size gutters and legend boxes, where
being a few pixels generous is harmless. **Actual centring is done by
SVG `text-anchor`**, which uses the rendering engine's real metrics. So
the weakest number in the package can never mis-centre a label — the
one place an estimate would visibly fail is the one place it is not
used.

The estimate does count CHARACTERS, not bytes. `len()` on a Hey string
returns bytes, so `len('a—b')` is 5 for a 3-character string, and a
byte-based gutter would be silently too wide for any label with an
accent, a currency symbol or a dash. `ReportsText.char_count` walks the
UTF-8 with `bytes()`/`byte_at()` and counts non-continuation bytes.

## Escaping: two renderers, two opposite rules

`ReportsSvg` escapes every label and every value through
`ReportsText.escape_xml`, because SVG is XML and a series label is
caller data. Unescaped, a data-driven chart is script injection with a
picture drawn around it. `specs/svg_spec.hey` puts
`<script>alert('pwn')</script>` in a series label, a category and a
title, and asserts the string `<script` does not appear in the output.

`ReportsScene` **must not** escape, because a scene is a JSON document
consumed by a native UIKit renderer, not markup. `to_json` does the
string encoding. Escaping there would put a literal `&amp;` on a
television screen. Both rules are asserted.

## No floating point. At all.

This package contains no float arithmetic. That is not minimalism; it
is a measured workaround.

In the compiled lane, **a float arriving as a function parameter is
truncated to an integer** when the body computes with it:

```hey
fn probe(value)
  says value          # interpreter: 1012.5999999999999
end                   # compiled:    1012
program
  probe(1012.5999999999999)
end
```

The first version of `Reports.project` computed
`to_i(ratio * span + 0.5)` and was right interpreted, one pixel short
compiled. The first `ReportsGeometry` was a Taylor-series sine and
returned 0 from the compiled binary — every pie slice at zero degrees,
exit 0.

So:

- `Reports.project` multiplies before dividing and rounds with
  `reports_round_div` — `(n + d/2) / d`, signs normalised because Hey's
  `/` truncates toward zero.
- `ReportsGeometry` carries a whole-degree sine table scaled by 1e6 and
  interpolates across tenths of a degree. Worst error ≈ 1.5e-5 of full
  scale: 0.008px at a 500px radius. Less accurate than the float
  version in the interpreter, and identical in both lanes, which is the
  trade that matters.
- Angles are integers in tenths of a degree; the last pie slice absorbs
  the rounding remainder so the pie always closes at exactly 3600.

`bin/check` diffs the two lanes on every spec, which is how all of this
was found.

## Colour

The categorical palette is the validated eight-hue default from the
data-viz reference palette, in **fixed slot order**. Slot 0 is always
blue; filtering a series out never repaints the survivors, because
colour follows the entity and not its rank.

The first six slots were re-validated as a set for this package:

| mode | worst adjacent CVD ΔE | worst adjacent normal-vision ΔE | contrast |
|---|---|---|---|
| light (`#fcfcfb`) | 9.1 (≥8) | 19.6 (≥15) | WARN on 3 slots |
| dark (`#1a1a19`) | 8.4 (≥8) | 19.3 (≥15) | all ≥ 3:1 |

The light-mode contrast warning obligates visible labels rather than
colour alone. That relief is structural here, not left to the caller: a
legend is emitted for every chart with two or more series and for every
pie, and pie slices are always direct-labelled with their percentage.

Past eight series the palette wraps and `ReportsTheme.wrapped?` returns
true. A ninth series should fold into "Other" — that is a caller
decision the package flags rather than makes.

## Television is a different problem, not a smaller screen

- **Overscan is real.** Consumer sets crop the edge of the signal, so
  the TV theme insets 5% on all four sides (96px × 54px on 1920×1080).
  `specs/theme_spec.hey` asserts the plot rectangle lands inside the
  safe rect, not merely inside the canvas.
- **10-foot viewing sets a floor on glyph size.** `font_min` is 28px and
  `clamp_font` enforces it. A renderer that wants 8px gets 28. A chart
  that drops a label is honest; a 12px axis label on a television is a
  chart nobody can read.
- **Dim rooms want a dark surface**, so the TV theme is dark and carries
  the palette's dark steps — not the light steps on a dark background,
  which is how contrast gets lost.

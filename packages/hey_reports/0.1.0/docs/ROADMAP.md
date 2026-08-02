# Roadmap

0.1.0 is deliberately narrow. What follows is in priority order, and
each item says what it is BLOCKED ON, because several of these are not
this package's to unblock.

## 0.2.0 — candidates

1. **Stacked and horizontal bars.** Pure model + SVG work, no blockers.
   Horizontal bars would also improve the TV renderer, which is already
   horizontal-only.
2. **Fractional axis ticks.** `Reports.nice_step` returns an integer, so
   a domain of 0..3 collapses to step 1 and a domain of 0..0.5 is
   meaningless. Needs a scaled-integer domain (value × 10^k) threaded
   through `project` and the tick labels. Not blocked, just not small.
3. **Time-series x axis.** Today the x axis is categorical. Dates need
   `stdlib:Time`, a date scale, and tick selection on non-uniform
   intervals (months are not 30 days).
4. **Direct labels on line charts.** The data-viz rules prefer a direct
   label at the end of each line over a legend for ≤ 4 series. Needs
   collision avoidance, which needs real font metrics — see below.

## Blocked on the language

5. **Real font metrics.** `ReportsText.text_width` estimates 0.6em per
   character. Reading a TrueType `hmtx`/`cmap` needs binary parsing that
   is possible today (`Files.read_bytes_at`, `Bytes.*`) but expensive,
   and the payoff is only in gutter sizing — `text-anchor` already does
   the centring correctly. **Low value until something needs collision
   detection.**
6. **Restoring floating point.** The package is integer-only because a
   float passed as a function parameter is truncated in the compiled
   lane (`docs/DESIGN.md`). If that is fixed, `ReportsGeometry` could
   drop its sine table. **This is a compiler fix, not a package fix**,
   and the integer version is good enough that it should not be
   prioritised for accuracy alone.

## Blocked on other packages

7. **A real mobile renderer.** `hey_mobile`'s `ui.hey` is 13 lines of
   screen/action metadata with no drawing vocabulary. Today mobile is
   served by SVG in a WebView. A native renderer needs hey_mobile to
   grow a drawing surface first.
8. **Line and pie on television.** `hey-tv-scene-v2` lays widgets out in
   three vertical slot columns with no absolute x/y
   (`hey_ios_tv/tools/hey_native_tv_runtime.m:714-733`), and `rect`
   reads only width/height. **Line and pie are impossible until
   scene-v2 gains either absolute frames or a path/canvas widget.**
   The cheapest unblock is a `path` widget kind carrying SVG path data
   — the tvOS renderer already has UIBezierPath.
9. **SVG on television.** `SCENE_CONTRACT.md` says an `image` widget's
   symbol may be a data URI; the renderer only calls
   `[UIImage systemImageNamed:]`. If that gained an SVG decoder, the
   whole scene renderer could be replaced by the SVG one. **Filed as a
   doc/implementation mismatch, not planned here.**

## Explicitly not planned

- **A pure-Hey PNG or JPEG encoder.** Rasteriser + font engine +
  DEFLATE. See `src/raster.hey` for the costing.
- **Interactivity.** Tooltips and hover need a DOM and an event loop.
  An SVG document embedded by hey_web can carry them; the package will
  not generate them, because the interaction belongs to the page.
- **A ninth categorical hue.** The palette is eight slots and wraps.
  A ninth series should fold into "Other" or become small multiples.

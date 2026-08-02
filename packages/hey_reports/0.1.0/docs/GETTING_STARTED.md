# Getting started

```hey
import 'pkg:hey_reports@0.1.0/main'

program
  let chart = Reports.chart(
    'bar',
    'Signups by day',
    ['Mon', 'Tue', 'Wed'],
    [Reports.series('Web', [120, 305, 210])])

  let svg = ReportsSvg.render(chart, ReportsTheme.web())
  let wrote = Files.write_text('signups.svg', svg)
end
```

That is the whole API for the common case. Three more things are worth
knowing on day one.

## Axis titles

`Reports.chart` leaves them empty. `Reports.labelled` fills them in:

```hey
let chart = Reports.labelled(
  Reports.chart('bar', 'Signups', days, [web, mobile]),
  'Weekday', 'Signups')
```

A bar chart with unlabelled axes is a decoration, not a report.

## Pick the surface, not the size

```hey
ReportsSvg.render(chart, ReportsTheme.web())     # 800x480, light
ReportsSvg.render(chart, ReportsTheme.mobile())  # 360x280, light
ReportsSvg.render(chart, ReportsTheme.tv())      # 1920x1080, dark, overscan-safe
```

The TV theme is not the web theme scaled up. It is a dark surface with
the dark-stepped palette, a 5% title-safe inset on all four sides so
overscan cannot crop the chart, and a 28px minimum glyph for 10-foot
viewing.

## Serving it from hey_web

```hey
HeyWebResponses.build(200, ReportsSvg.content_type(), ReportsSvg.render(chart, theme))
```

Or inline it with no second request:

```hey
'<img alt="Signups by day" src="' + ReportsSvg.data_uri(svg) + '">'
```

## Values are integers

0.1.0 does all its arithmetic in integers, deliberately (see
`DESIGN.md` — floats do not survive the compiled lane). A float value is
truncated. **Pass cents, not dollars.**

jayteesf.github.io
==================

about JayTeeSF

Medley and Solitaire usage statistics
-----------------------

The six `closing-medley*.html` pages and `solitaire.html` send aggregate page-load counts to
https://jayteesf.goatcounter.com. Reloads count separately; session tracking is
disabled. Page versions remain separate, and query strings are excluded from
page names. GoatCounter also collects referrers and supports tagged sharing
links, for example:

    https://www.jayteesf.com/closing-medley.html?utm_campaign=medley-share&utm_source=church-newsletter

`closing-medley-analytics.js` records `medley-started:<page path>` on the first
actual playback and `medley-completed:<page path>` when playback first reaches
the end. Both are counted once per page load, including on the YouTube version;
pause/resume, buffering, and replays do not inflate these counters. Reaching the
end does not prove every second was heard, since users can seek. Events that
happen before GoatCounter finishes loading are queued in memory. Blocked
analytics does not prevent playback.

In the GoatCounter dashboard's Settings → Data collection, enable browsers,
systems, locations, and screen sizes to see those aggregate breakdowns. Leave
sessions and individual pageviews disabled. These account settings must be
checked while signed in; changing this repository cannot enable them. No visitor
identifiers or persistent visitor storage are added by the medley code.

To exclude your own browser, open the medley with `#toggle-goatcounter` appended
and reload, then follow GoatCounter's prompt. Repeat for each browser you use.
Counts begin after deploying these changes; historical usage is unavailable.

Verify playback counters locally with:

    node --test tests/medley-analytics.test.cjs

Potential Image Sources:

Pexels: https://www.pexels.com - Free stock photos and videos shared by talented creators.
Unsplash: https://unsplash.com - Free high-resolution photos.
Pixabay: https://pixabay.com - Free images and videos, safe for commercial use.
Tools for Image Selection:

Canva: https://www.canva.com - Offers a free tier with templates and easy access to free images. Useful for designing and customizing visuals.
Adobe Spark: https://spark.adobe.com - A tool for creating social graphics, web pages, and short videos, which can help in finding suitable images and enhancing their appearance.
These tools allow you to quickly search for images based on keywords and customize them to fit your website’s aesthetic.



Hey scripts
-----------

Run the site's Hey scripts through `bin/hey-run`, from the repo root:

    bin/hey-run generate-articles-index            # rewrites articles/index.html
    bin/hey-run generate-packages-index --workers 1  # rewrites packages/index.html

The first run builds the script once with `heyc build` into `.hey-bin/` (gitignored,
about a second); later runs start instantly from that binary. It rebuilds only when
the script, one of its stdlib imports, or the pinned Hey's compiler changes. The Hey
is pinned in `bin/hey-run` to `~/dev/hey-lang-bootstrap-plan` rather than whatever
`hey` is on PATH; override with `SITE_HEY_ROOT=/path/to/hey`.

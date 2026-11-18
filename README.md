jayteesf.github.io
==================

about JayTeeSF

Hey documentation catalogue
---------------------------

The topic catalogue is `articles/hey-docs-index.html`, and the starting guide for
learning Hey is `articles/hey-guide-start-here-first-steps-1.html`. Each Hey page owns
its `article-date` (`YYYY-MM`), `hey-docs-group`, `hey-docs-title`, `hey-docs-purpose`
and `hey-docs-rank` metadata (dates belong inside articles, never in article URLs). Each H2 owns a stable `id` and a short `data-doc-purpose`; keep the ID
when changing a heading so existing links continue to work. There is no separate
list of section headings to synchronize.

After editing a Hey page, regenerate and check the catalogue, validate the HTML,
then regenerate the general articles listing:

    hey generate-hey-docs-index.hey
    hey generate-hey-docs-index.hey --check
    hey test/check-hey-docs-index.hey
    hey validate-html.hey index.html articles/*.html
    hey generate-articles-index.hey

These Hey generators use only the Hey standard library. The catalogue remains
usable without JavaScript; its small search enhancement runs entirely locally.
The two Functions pages are current companions. Use the `history` group for
earlier, version-scoped essays. The shared `articles/hey-docs-navigation.css`
styles each page's return link to the docs index.

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

Run the site's Hey scripts directly with `hey`, from the repo root:

    hey generate-hey-docs-index.hey             # rewrites articles/hey-docs-index.html
    hey test/check-hey-docs-index.hey           # checks catalogue & section links
    hey validate-html.hey index.html articles/*.html
    hey generate-articles-index.hey             # rewrites articles/index.html
    hey generate-packages-index.hey --workers 1 # rewrites packages/index.html

`hey` compiles each script once into the content-addressed run cache and runs
subsequent invocations directly as cached native binaries (`generate-articles-index.rb`
and `generate-packages-index.rb` are retained alongside their `.hey` counterparts
for the side-by-side scripting benchmark in `articles/hey-command-line-scripting.html`).

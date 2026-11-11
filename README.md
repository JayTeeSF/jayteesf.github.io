jayteesf.github.io
==================

about JayTeeSF

Hey documentation catalogue
---------------------------

The topic catalogue is `articles/2026-10-25-hey-index.html`. Each Hey page owns
its `hey-docs-group`, `hey-docs-title`, `hey-docs-purpose` and `hey-docs-rank`
metadata. Each H2 owns a stable `id` and a short `data-doc-purpose`; keep the ID
when changing a heading so existing links continue to work. There is no separate
list of section headings to synchronize.

After editing a Hey page, regenerate and check the catalogue, then regenerate
the general articles listing:

    ruby generate-hey-docs-index.rb
    ruby generate-hey-docs-index.rb --check
    ruby test/check-hey-docs-index.rb
    ruby generate-articles-index.rb

These Ruby generators use only the standard library. The catalogue remains
usable without JavaScript; its small search enhancement runs entirely locally.
The two Functions pages are current companions. Use the `history` group for
earlier, version-scoped essays. The shared `articles/hey-docs-navigation.css`
styles each page's return link to the docs index.

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

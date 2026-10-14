jayteesf.github.io
==================

about JayTeeSF

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

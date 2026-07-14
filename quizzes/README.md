# Hey quiz site

Copy the `quizzes/` directory into the root of `jayteesf.github.io`:

```sh
cd "$HOME/dev/jayteesf.github.io"
unzip -o "$HOME/Downloads/jayteesf-quizzes-site.zip"
git status --short
git add quizzes
git commit -m "Add Hey programming quiz catalog"
```

The public path is `https://www.jayteesf.com/quizzes/`. Reference solutions are fetched only after an explicit browser confirmation, but this is a spoiler gate rather than security: a static host necessarily exposes deployed files.

The uploaded `crawled_rubyquizes.zip` contained crawler source only and no crawled quiz HTML. This catalog is therefore a newly written curated adaptation with provenance links, not a mechanical extraction.

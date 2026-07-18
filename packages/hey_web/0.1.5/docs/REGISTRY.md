# Registry publication

Publish to the local website checkout with:

```sh
bin/publish
```

The default registry root is `$HOME/dev/jayteesf.github.io/packages`. Publication refuses to replace an existing `hey_web/0.1.5` directory, stages only that immutable version, commits only `packages/hey_web/0.1.5`, and never pushes.

Use `bin/publish --no-commit` to inspect the website change before committing.

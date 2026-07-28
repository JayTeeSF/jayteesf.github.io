# Testing

```sh
heyc specs/main_spec.hey --test
```

`specs/main_spec.hey` is the package's spec. It runs on the INTERPRETER, so
it cannot see defects that exist only in the compiled LLVM lane - a
distinction that has bitten sibling packages repeatedly (a JSON-decoded
integer that could not index an array, a string silently coerced to 0 when
assigned to an integer-typed local). Anything in this package whose
behaviour could differ between lanes needs a compiled-lane check as well as
a spec.

Package-level verification, which also checks the manifest, the docs set and
the release layout:

```sh
hey-packager check .
```

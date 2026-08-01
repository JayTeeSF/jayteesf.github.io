# Testing

```sh
./bin/check          # renders, byte-identity, dockerignore, refusals
./bin/check-docker   # builds real images and serves real HTTP (needs Docker)
```

`bin/check` needs no Docker: it exercises rendering, asserts the
staging/production renders are byte-identical, asserts `.dockerignore`
excludes `.git` and `.env`, and asserts the `bind(` refusal fires in both
lanes.

`bin/check-docker` builds images and curls them. It asserts the health
response **body and its length**, not the status code — a 200 with a
zero-length body is the failure this package exists to make visible, so a
status-only assertion would pass over exactly what it must catch.

## Docker availability

If `docker version` fails, check `docker context ls` before concluding
Docker is absent. A selected-but-down context (`rancher-desktop`) reports
the same failure as no Docker at all, while another runtime (colima) is
running. That cost a nearly-false "Docker unavailable" report during
development.

## Breaking gates on purpose

Every gate here has been seen red deliberately, and it is worth
repeating after any change:

- sabotage `render('staging')` → `staging==production` goes red
- return an empty body from the fixture → the empty-200 gate goes red
- add a `bind(` handler to the fixture → the refusal fires in both lanes

One of those sabotages found a real hole: the shell identity step stayed
green because the CLI bypassed `render()`. A gate that cannot go red is
not evidence, and the only way to know is to break the subject.

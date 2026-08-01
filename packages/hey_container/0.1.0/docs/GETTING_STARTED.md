# Getting started

```sh
cd your-hey-web-app
hey-container dockerfile --env production --out Dockerfile
docker build -t your-app:latest .
docker run --rm -p 3000:3000 -e HEY_ENV=production -e HOST=0.0.0.0 your-app:latest
curl -sf localhost:3000/up
```

**`HOST=0.0.0.0` is required.** `hey_web` defaults to `127.0.0.1`, which
inside a container binds the container's own loopback and nothing outside
can connect. The default is deliberate — binding every interface by
default would expose a developer's laptop to its network to spare a
container one variable — so exposure is opt-in, and this is the opt-in.

## Verify the health endpoint by BODY

```sh
curl -sf localhost:3000/up | grep -q '"status":"ok"' || echo BROKEN
```

Not by status code. A failed `hey_web` handler can return **200 with an
empty body**, and a code-only check passes over a dead app. See
`docs/README.md` for the three measured failure modes.

## Environments

```sh
hey-container dockerfile --env development --out Dockerfile.dev   # source mounted
hey-container dockerfile --env test        --out Dockerfile.test  # suite + scratch db
hey-container dockerfile --env production  --out Dockerfile       # == staging, byte for byte
```

`staging` and `production` render identically; select between them at run
time with `HEY_ENV`, and point them at different databases through
configuration.

## Deploying

This package builds images. Deploy them with Kamal —
`builder: driver: docker` (not the default), and `builder: arch` matching
your server. `docs/README.md` has the four things that cost a real
deployment time.

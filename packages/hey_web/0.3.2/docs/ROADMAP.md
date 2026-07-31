# Roadmap

## 0.1.3 — delivered

- Standardized validation, release, source ZIP, and registry publication through `hey_packager`.
- Removed the obsolete private source-checksum/release-record implementation.
- Retained the stdlib-first web framework and CLI behavior from 0.1.2.

## 0.1.7 — current compatibility release

- Canonical relative-import casing fix for `jobs.hey` required by compiler >=0.99.445a.

## 0.1.6

- Use the current `files.exists?` API in configuration and EHY view preparation.
- Keep `hey_packager` as external release tooling rather than a runtime dependency.
- Require `hey_packager >=0.1.2 <0.2.0` for HEY_ROOT-correct documentation checks.

## 0.1.6

- Cookies, signed sessions, form decoding, named routes, request-test helpers, and streaming conveniences.

## 0.1.6

- Multipart requests, byte ranges, graceful drain, and broader production receipts.

## 0.3.2 — released (fix)

`HeyWebConfig.defaults()` now reads `HOST` and `PORT` from the
environment, falling back to the same `127.0.0.1:3000` it always
returned. `listen.hey`'s accessors have always read those variables;
`defaults()` hardcoded straight past them, so a **containerised app had
no way to reach its own listener** — it bound the loopback inside the
container and nothing outside could connect.

`127.0.0.1` remains the fallback, deliberately. Defaulting to `0.0.0.0`
would expose every developer's laptop to its network to spare a
container one environment variable, so exposure stays opt-in.

It uses `host_with`/`port_with` with this lane's own fallbacks rather
than the bare `host()`/`port()` accessors: those carry the env lane's
reference default of 3748, and `listen.hey` states that the two lanes
are configured independently on purpose. `specs/server_spec.hey` caught
the first attempt doing exactly that — the plan came back on 3748. With
an unset environment the answer is byte-identical to 0.3.1.

Found while evaluating Kamal for deployment: Kamal requires a TCP port
reachable on its bridge network, which a hardcoded loopback makes
impossible.

**0.3.1 was tagged in git but never reached the registry**, so 0.3.2 is
the first published release carrying both that fix and this one.

## 0.3.1 — released in git, never published (fix)

`HeyWebJobs.accepted` returned `{"receipt": null}` for the whole 0.3.0
release: it read `receipt.sequence`, and a job receipt's identifier is
`id`. An absent field is nil rather than an error, so the 202 was well
formed and unusable. Now `{accepted, job, receipt}`.

`specs/jobs_spec.hey` is new. This module had NO spec, which is how it
reached a release; the spec asserts the receipt shape against a real
enqueue rather than a fixture.

**Known gap, not fixed here.** A route handler still cannot reach a job
pool created at boot: `Jobs.define` is not name-identified (same name,
two calls, two pools) and hey_web threads no application state to
handlers. hey_web cannot close this alone -- Hey has no closures, and
the runtime exposes no name lookup for pools. The runtime already keeps
a named table (`hey_named_jobs`, with `job->name` populated); it is
searched by id only. The fix belongs in core.

## 0.3.0 — staged (breaking)

- Deleted the Web.service/Web.start-reaching middleware serving lane (never invoked a compiled handler); one serving lane: Web.serve over a flat route table with {host, port, workers, request_timeout_ms, max_body_bytes}.
- Fast-lane modules extracted from RecallCoach: listen, origin, request_support, request_log, responses (prefix-parameterized env names, never-nil surfaces, compiled receipt).
- pages-embed generator: assets render into a generated heredoc pages module; single-quote/CRLF refusal; interpreted + compiled byte round-trip receipts.
- Housekeeping: src/ duplicates, legacy bin/client, and the ../elders_prayer_app heyc fallback removed.

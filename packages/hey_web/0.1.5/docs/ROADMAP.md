# Roadmap

## 0.1.3 — delivered

- Standardized validation, release, source ZIP, and registry publication through `hey_packager`.
- Removed the obsolete private source-checksum/release-record implementation.
- Retained the stdlib-first web framework and CLI behavior from 0.1.2.

## 0.1.5 — current compatibility release

- Use the current `files.exists?` API in configuration and EHY view preparation.
- Keep `hey_packager` as external release tooling rather than a runtime dependency.
- Require `hey_packager >=0.1.2 <0.2.0` for HEY_ROOT-correct documentation checks.

## 0.1.5

- Cookies, signed sessions, form decoding, named routes, request-test helpers, and streaming conveniences.

## 0.1.6

- Multipart requests, byte ranges, graceful drain, and broader production receipts.

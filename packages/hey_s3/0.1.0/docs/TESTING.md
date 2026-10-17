# Testing hey_s3

`bin/check` runs signed file-backed native HTTP fixtures and an ordinary compiler receipt. The HTTP tests cover checksum mismatch, truncation, byte limits, exclusive output preservation, conditional writes, redirects and exact dot-segment keys. They use a loopback server, fixture credentials and task-owned files, never a real bucket.

`bin/check-linux` generates the Linux ABI and compiles/runs the same native HTTP fixtures in a Linux amd64 Docker container. `--help` documents executable and relative-path discovery. Linux validation uses Debian bookworm, GCC and libcurl/OpenSSL from that distribution. This verifies native x86-64 execution and dynamic linkage; it is not a measurement on a production server. Both this target and Darwin arm64 pass the 11-request HTTP fixture.

Production S3 authentication/integrity requires a separate real-bucket integration test by a consumer with permission to write an isolated prefix. The fixture validates signing/checksum headers and transfer behavior, but does not independently validate AWS cryptographic signatures.

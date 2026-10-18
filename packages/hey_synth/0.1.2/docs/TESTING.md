# Testing

Run `bin/check`. The ordinary compiler builds and runs the package receipt, checking first/last names, email reproducibility, plan/render parity, namespace isolation, key/length limits, UTF-8 names and fixed refusal errors. Tests require no database, network, credentials or synthetic-data service. Only final passing receipts are kept under docs/results.

Package release metadata is processed by compiled Hey through hey_packager >= 0.1.11; Python is not required. Toolchain discovery accepts HEY/HEY_ROOT or PATH, with a relative sibling checkout as the fallback.

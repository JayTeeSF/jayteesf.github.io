# Testing

Run bin/check. Ordinary LLVM compilation and native calls produce exact hashes compared with the installed Ruby scrypt gem; Ruby verifies correct/incorrect inputs, non-ASCII secrets and leading-zero salts. No database, network, user records or live credentials are used. Ruby scrypt is a test-only dependency, not a deployment runtime.

Package release metadata is processed by compiled Hey through hey_packager >= 0.1.11; Python is not required. Toolchain discovery accepts HEY/HEY_ROOT or PATH, with a relative sibling checkout as the fallback.

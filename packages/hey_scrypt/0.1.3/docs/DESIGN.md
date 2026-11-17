# Design

OpenSSL EVP_PBE_scrypt derives bytes. The wrapper emits the modern hexadecimal Ruby scrypt representation and reproduces its whole-leading-zero-byte salt handling. Salt lengths of 40 hexadecimal characters are refused because the Ruby verifier interprets those as a legacy format. Legacy password creation and host-dependent calibration are not supplied. Application-specific token concatenation stays in the consumer. Native calls are blocking, thread-safe and bound input, output and derivation memory.

Reference: https://docs.openssl.org/3.0/man7/EVP_KDF-SCRYPT/

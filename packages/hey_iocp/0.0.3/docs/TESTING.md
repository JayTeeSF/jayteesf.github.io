# Testing

> EXPERIMENTAL / UNVERIFIED: none of this runs the loop on Windows.

`bin/check` (hey-packager) runs `bin/package-check`, which proves:

1. the in-source version literal equals `VERSION`; no `HeyValue` in native sources;
2. `specs/porcelain_spec.hey` (on the Unix build host): `version()`, `backend()`,
   and `open()` refusing with `iocp_unsupported_os`;
3. `bin/build-native` cross-builds `hey_iocp.dll` with `-Wall -Wextra -Werror`;
   `llvm-readobj` confirms an x86-64 PE DLL that exports
   `hey_native_hey_iocp_extension_v1` and imports exactly ws2_32.dll,
   kernel32.dll and msvcrt.dll;
4. negative controls: `hey_iocp.c` must refuse to compile for the host (it is
   Windows-only by `#error`), and the porcelain spec must FAIL against an
   `iocp.hey` whose OS guard was removed.

It does not prove that a single socket call is right. `specs/windows_loop_spec.hey`
(hey_epoll's loop contract) is shipped for the first Windows run and is not
executed by the check. The docs example the packager runs is
`docs/examples/backend.hey`, which only reports the refusal off Windows.

Package release metadata is processed by compiled Hey through hey_packager >= 0.1.11; Python is not required.

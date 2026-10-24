# Hey 0.99.605a Linux benchmark results

Measured October 23, 2026, 15:48–16:27 PDT by actor linux, native x86_64 i7-1165G7 on AC power. Source 7e5947113; benchmark checkout f30c552abda84244b941fff31eef726898d8bb8a. Full compiler hashes and isolated environment are in [execution_identity.txt](execution_identity.txt).

- [matrix.csv](matrix.csv): W1–W12, seven languages, 84/84 PASS; best of three wall times, CPU, peak RSS and instructions.
- [scaling.csv](scaling.csv): seven operations at six sizes, 42 measurements.
- [1brc.csv](1brc.csv): 10M rows, 1,000 stations. Hey 11.261 s, C 0.178 s, 63.3× C. Hey 5.8 MB peak RSS, 15,283.3 instructions/row. Compare 604a: 12.937 s, C 0.178 s, Hey 5.7 MB and 15,289.3 instructions/row. A single round's wall-time difference is not proof of reduced work.
- [1brc_10m.log](1brc_10m.log): output SHA-256 agrees with the C oracle. Absolute artifact paths in the log identify the measuring host.
- [web9.log](web9.log): all nine servers NEVER-UP under a sandbox denying socket creation. The header-only [web9.csv](web9.csv) contains no measurements. Web9 needs a run from the host terminal; previous throughput must not be relabelled as 605a.
- [all_long.csv](all_long.csv): completed measurements in long format.

No clean build, image push or billion-row run was repeated in this measurement round. No claim of Stage0 elimination is made. Partial raw_20261023b is excluded from scorecard history.

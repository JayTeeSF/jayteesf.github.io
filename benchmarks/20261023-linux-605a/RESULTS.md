# Hey 0.99.605a Linux benchmark results

Measured October 23, 2026, 15:48–16:27 PDT by actor linux, native x86_64 i7-1165G7 on AC power. Source 7e5947113; benchmark checkout f30c552abda84244b941fff31eef726898d8bb8a. Full compiler hashes and isolated environment are in [execution_identity.txt](execution_identity.txt).

- [matrix.csv](matrix.csv): W1–W12, seven languages, 84/84 PASS; best of three wall times, CPU, peak RSS and instructions.
- [scaling.csv](scaling.csv): seven operations at six sizes, 42 measurements.
- [1brc.csv](1brc.csv): 10M rows, 1,000 stations. Hey 11.261 s, C 0.178 s, 63.3× C. Hey 5.8 MB peak RSS, 15,283.3 instructions/row. Compare 604a: 12.937 s, C 0.178 s, Hey 5.7 MB and 15,289.3 instructions/row. A single round's wall-time difference is not proof of reduced work.
- [1brc_10m.log](1brc_10m.log): output SHA-256 agrees with the C oracle. Absolute artifact paths in the log identify the measuring host.
- [web9.csv](web9.csv) and [web9.log](web9.log): measured October 24, 2026 at 21:18 UTC, all nine languages × three endpoints (27/27 cells), with bodies verified before timing. Same pinned 605a binaries: see [web9_execution_identity.txt](web9_execution_identity.txt). One 8-second sample per endpoint after a 2-second warmup, 64 connections, four workers; no median/spread yet. p99.9 and instructions are not measured. Load rose from 0.63 to 6.48. This closes the socket-access gap but is not the required >=10-run qualification. The previous failed socket run is preserved in [web9_socket_denied.log](web9_socket_denied.log). [web9_runner.sh](web9_runner.sh) preserves the runner: Ruby replaces the JSON parsing tool; occupied ports are refused rather than killing unrelated processes. The existing Python comparison server remains a benchmark lane.
- [all_long.csv](all_long.csv): completed October 23 compute/1BRC and October 24 web9 measurements in long format. Dates and repetition counts differ by panel as described above.

No clean build, image push or billion-row run was repeated in this measurement round. No claim of Stage0 elimination is made. Partial raw_20261023b is excluded from scorecard history.

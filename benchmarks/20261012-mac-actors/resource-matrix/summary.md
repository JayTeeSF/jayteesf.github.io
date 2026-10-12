# Complete efficiency matrix (all requested cells)

Unprofiled, prebuilt commands. Whole-process CPU is not application-window CPU.
Versions are plan-declared; executable and raw-log hashes are measured.

| Case | Runtime | Status | Metric | CPU s | Peak RSS bytes | Peak footprint bytes |
|---|---|---|---:|---:|---:|---:|
| 1brc | hey599a | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| 1brc | hey600a_runtime | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| 1brc | hey_cooperate_park | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| 1brc | go | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| 1brc | erlang | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| 1brc | tokio | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| 1brc | pony | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| 1brc | caf | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| 1brc | akka | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| fanin8m | hey599a | PASS | 17845707.5 | 0.8550000000000001 | 388677632.0 | 388022896.0 |
| fanin8m | hey600a_runtime | PASS | 18170705.0 | 0.8400000000000001 | 388685824.0 | 388022920.0 |
| fanin8m | hey_cooperate_park | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| fanin8m | go | PASS | 23983726.0 | 0.7 | 4751360.0 | 3375608.0 |
| fanin8m | erlang | PASS | 4714778.5 | 12.955000000000002 | 263577600.0 | 254305024.0 |
| fanin8m | tokio | PASS | 7035779.0 | 3.6450000000000005 | 2285568.0 | 1499472.0 |
| fanin8m | pony | PASS | 13221488.0 | 5.055 | 210763776.0 | 210748424.0 |
| fanin8m | caf | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| fanin8m | akka | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| pairs | hey599a | PASS | 87041122.0 | 0.93 | 7766016.0 | 6963560.0 |
| pairs | hey600a_runtime | PASS | 87370535.5 | 0.935 | 7815168.0 | 6996304.0 |
| pairs | hey_cooperate_park | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| pairs | go | PASS | 23390540.0 | 3.44 | 65413120.0 | 64037428.0 |
| pairs | erlang | PASS | 6495021.0 | 9.56 | 115703808.0 | 106332760.0 |
| pairs | tokio | PASS | 64944684.0 | 1.24 | 36732928.0 | 35864936.0 |
| pairs | pony | PASS | 160292493.0 | 0.965 | 54525952.0 | 54395744.0 |
| pairs | caf | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| pairs | akka | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| ring2 | hey599a | PASS | 69.0 | 0.07 | 2695168.0 | 1859908.0 |
| ring2 | hey600a_runtime | PASS | 70.0 | 0.07 | 2703360.0 | 1868088.0 |
| ring2 | hey_cooperate_park | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| ring2 | go | PASS | 104.5 | 0.14 | 4284416.0 | 2908664.0 |
| ring2 | erlang | PASS | 206.0 | 0.33 | 61267968.0 | 51855924.0 |
| ring2 | tokio | PASS | 75.0 | 0.12000000000000001 | 2236416.0 | 1450320.0 |
| ring2 | pony | PASS | 361.0 | 4.265000000000001 | 4972544.0 | 4834120.0 |
| ring2 | caf | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| ring2 | akka | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| ring100k | hey599a | PASS | 84.0 | 0.19 | 23937024.0 | 23126352.0 |
| ring100k | hey600a_runtime | PASS | 86.0 | 0.19 | 22339584.0 | 21528924.0 |
| ring100k | hey_cooperate_park | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| ring100k | go | PASS | 267.5 | 0.66 | 306085888.0 | 304800488.0 |
| ring100k | erlang | PASS | 410.0 | 1.2149999999999999 | 364380160.0 | 355123968.0 |
| ring100k | tokio | PASS | 165.0 | 0.51 | 167034880.0 | 161858004.0 |
| ring100k | pony | PASS | 723.0 | 10.36 | 206675968.0 | 206594984.0 |
| ring100k | caf | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| ring100k | akka | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| sleepers | hey599a | PASS | 106.0 | 0.06999999999999999 | 36118528.0 | 36382592.0 |
| sleepers | hey600a_runtime | PASS | 105.0 | 0.07500000000000001 | 36192256.0 | 36456320.0 |
| sleepers | hey_cooperate_park | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| sleepers | go | PASS | 102.0 | 0.0 | 10813440.0 | 9429520.0 |
| sleepers | erlang | PASS | 102.0 | 0.15000000000000002 | 66461696.0 | 57057868.0 |
| sleepers | tokio | PASS | 111.0 | 0.0 | 4849664.0 | 4063568.0 |
| sleepers | pony | PASS | 107.0 | 0.07500000000000001 | 14655488.0 | 14508896.0 |
| sleepers | caf | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| sleepers | akka | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| spawn | hey599a | PASS | 17693314.0 | 0.2 | 23879680.0 | 23085428.0 |
| spawn | hey600a_runtime | PASS | 16840806.0 | 0.19 | 24264704.0 | 23470452.0 |
| spawn | hey_cooperate_park | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| spawn | go | PASS | 1668503.5 | 0.37 | 295804928.0 | 294544104.0 |
| spawn | erlang | PASS | 2005629.5 | 0.53 | 341893120.0 | 332653336.0 |
| spawn | tokio | PASS | 1844706.0 | 0.23 | 98779136.0 | 97894808.0 |
| spawn | pony | PASS | 1965762.5 | 1.815 | 169050112.0 | 169010148.0 |
| spawn | caf | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| spawn | akka | NOT_RUN | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |

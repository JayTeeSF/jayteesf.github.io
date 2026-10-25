#!/usr/bin/env bash
# 9-language web-throughput bench, one workload, byte-verified bodies, oha load gen.
# Lanes: hey go ruby node python java c rust erlang. Each pinned to WK workers.
# STACK per lane is labeled in the output (production vs stdlib/hand-rolled) — this
# measures "the language + its readily-available HTTP server", not a tuned deployment.
set +u
WROOT=/home/jthomas/dev/hey-lang-bootstrap-plan
ROOT="$WROOT"
. "$WROOT/bin/htgz-env.sh" 2>/dev/null
ROOT="$WROOT"   # htgz-env.sh clobbers ROOT; restore it
H="$ROOT/benchmarks/web/harness"
PORT="${PORT:-3097}"; WK="${WK:-4}"; DUR="${1:-8}"; CONC="${2:-64}"
T="$(mktemp -d)"; LOG="$ROOT/bench/raw_20261024_web9_605a/web9_results.md"
PLAIN_WANT='Hello, World!'; JSON_WANT='{"message":"Hello, World!"}'
PARAMS_WANT='{"query":"id=42","path":"/params","method":"GET"}'
# Hey's request.query is a parsed map by design (GippiPiTy 2026-10-21, true at 603a 785516133 and 604a)
PARAMS_WANT_HEY='{"query":{"id":"42"},"path":"/params","method":"GET"}'
GEN=oha; command -v oha >/dev/null || GEN=wrk
say(){ printf "%s\n" "$*" | tee -a "$LOG"; }
freeport(){ if ss -ltnH "sport = :$PORT" | read -r _; then echo "Port $PORT occupied; refusing to stop an unrelated process" >&2; exit 1; fi; }

# ---- build servers ----
"$H/gen_real_server.sh" "$PORT" "$WK" "$T/bench.hey"
"$ROOT/build/heyc" build "$T/bench.hey" -o "$T/hey_srv" >/dev/null 2>&1 || echo "WARN hey build failed"
( cd "$H" && go build -o "$T/go_srv" real_server.go ) 2>/dev/null || echo "WARN go build failed"
clang -O3 -o "$T/c_srv" "$H/real_server.c" -lpthread 2>/dev/null || echo "WARN c build failed"
rustc -O -o "$T/rust_srv" "$H/real_server.rs" 2>/dev/null || echo "WARN rust build failed"
( cd "$H" && erlc real_server.erl ) 2>/dev/null || echo "WARN erlang build failed"
( cd "$H" && javac RealServer.java ) 2>/dev/null || echo "WARN java build failed"

: > "$LOG"
say "# 9-language web throughput — Linux, Hey v$("$ROOT/build/heyc" --version|head -1) ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
say "Host: $(uname -srm) | $(grep -m1 'model name' /proc/cpuinfo|cut -d: -f2|sed 's/^ //') | 4C/8T"
say "gen: $GEN -c$CONC -z${DUR}s (keep-alive) | workers=$WK pinned | bodies verified byte-for-byte"
say "versions: Hey $("$ROOT/build/heyc" --version|head -1) | Go $(go version|grep -oE 'go[0-9.]+') | Ruby $(ruby -e 'print RUBY_VERSION') | Node $(node --version) | Python $(python3 --version|grep -oE '[0-9.]+') | Java $(java -version 2>&1|head -1|grep -oE '\"[0-9._]+\"'|tr -d '\"') | clang $(clang --version|grep -oE 'version [0-9.]+'|head -1) | rustc $(rustc --version|grep -oE '[0-9.]+'|head -1) | Erlang $(erl -eval 'io:format("~s",[erlang:system_info(otp_release)]),halt().' -noshell)"
say ""
printf '%-8s %-22s %-7s %12s %10s %10s %9s %13s %10s\n' lane stack endpoint "rps" "p50_ms" "p99_ms" "srv_cpu_s" "req_per_cpu_s" "srv_rss_mb" | tee -a "$LOG"
CSVF="${CSV:-}"; [ -n "$CSVF" ] && echo "lane,stack,endpoint,rps,p50_ms,p99_ms,srv_cpu_s,req_per_cpu_s,srv_peak_rss_mb,duration_s,conc,workers" > "$CSVF"
# Server-side cost, whole process tree (setsid => every server pid shares session $sh).
# cpu: sum of utime+stime over live pids; rss: sum of per-process VmHWM (peak) in MB.
TCK=$(getconf CLK_TCK)
tree_pids(){ ps -eo pid=,sid= | awk -v s="$1" '$2==s{print $1}'; }
tree_cpu(){ for p in $(tree_pids "$1"); do awk '{print $14+$15}' /proc/$p/stat 2>/dev/null; done | awk -v t="$TCK" '{c+=$1} END{printf "%.3f", c/t}'; }
tree_hwm(){ for p in $(tree_pids "$1"); do awk '/^VmHWM/{print $2}' /proc/$p/status 2>/dev/null; done | awk '{k+=$1} END{printf "%.1f", k/1024}'; }

# oha JSON -> rps p50 p99 (ms)
measure_ep(){ url="$1"
  if [ "$GEN" = oha ]; then
    "$GEN" --output-format json -c "$CONC" -z "${DUR}s" --no-tui "$url" 2>/dev/null | ruby -rjson -e 'd=JSON.parse(STDIN.read); pl=d.fetch("latencyPercentiles",{}); printf "%.0f %.2f %.2f\n", d.fetch("summary").fetch("requestsPerSec"), pl.fetch("p50",0)*1000, pl.fetch("p99",0)*1000'
  else
    r=$("$GEN" -t4 -c "$CONC" -d"${DUR}s" "$url" 2>&1 | sed -n 's/^Requests\/sec: *//p'|head -1)
    echo "$r 0 0"
  fi
}
run_lane(){ lane="$1"; stack="$2"; startcmd="$3"
  freeport
  setsid bash -c "$startcmd" >"$T/$lane.log" 2>&1 & sh=$!
  up=0; for i in $(seq 1 60); do b=$(curl -s --max-time 2 "http://127.0.0.1:$PORT/plain" 2>/dev/null); [ -n "$b" ] && { up=1; break; }; sleep 0.5; done
  if [ "$up" != 1 ]; then say "$(printf '%-8s %-22s %-7s %12s' "$lane" "$stack" "-" "NEVER-UP")"; kill -- -"$sh" 2>/dev/null; kill "$sh" 2>/dev/null; return; fi
  for ep in plain json params; do
    case "$ep" in
      plain)  url="http://127.0.0.1:$PORT/plain";        want="$PLAIN_WANT" ;;
      json)   url="http://127.0.0.1:$PORT/json";         want="$JSON_WANT" ;;
      params) url="http://127.0.0.1:$PORT/params?id=42"; want="$PARAMS_WANT"; [ "$lane" = hey ] && want="$PARAMS_WANT_HEY" ;;
    esac
    body=$(curl -s --max-time 3 "$url" | tr -d '\n')
    if [ "$body" != "$want" ]; then say "$(printf '%-8s %-22s %-7s %12s' "$lane" "$stack" "$ep" "BADBODY")"; continue; fi
    "$GEN" -c "$CONC" -z 2s --no-tui "$url" >/dev/null 2>&1   # warmup
    c0=$(tree_cpu "$sh")
    read rps p50 p99 <<<"$(measure_ep "$url")"
    c1=$(tree_cpu "$sh"); hwm=$(tree_hwm "$sh")
    cs=$(awk "BEGIN{printf \"%.2f\",$c1-$c0}")
    rpc=$(awk "BEGIN{c=$c1-$c0; if(c>0) printf \"%.0f\",$rps*$DUR/c; else print \"-\"}")
    printf '%-8s %-22s %-7s %12s %10s %10s %9s %13s %10s\n' "$lane" "$stack" "$ep" "$rps" "$p50" "$p99" "$cs" "$rpc" "$hwm" | tee -a "$LOG"
    [ -n "$CSVF" ] && echo "$lane,\"$stack\",$ep,$rps,$p50,$p99,$cs,$rpc,$hwm,$DUR,$CONC,$WK" >> "$CSVF"
  done
  kill -- -"$sh" 2>/dev/null; kill "$sh" 2>/dev/null; sleep 0.4
}

run_lane hey    "Web.serve(native)"   "'$T/hey_srv'"
# Opt-in: same Hey server with mimalloc preloaded (WEB9_MIMALLOC=/path/libmimalloc.so).
[ -n "${WEB9_MIMALLOC:-}" ] && run_lane hey+mi "Web.serve+mimalloc"  "LD_PRELOAD='$WEB9_MIMALLOC' '$T/hey_srv'"
run_lane go     "net/http(stdlib)"    "GOMAXPROCS=$WK '$T/go_srv' $PORT $WK"
run_lane rust   "std::net(handrolled)" "'$T/rust_srv' $PORT $WK"
run_lane c      "sockets(handrolled)" "'$T/c_srv' $PORT $WK"
run_lane node   "http(stdlib)"        "node '$H/real_server.js' $PORT $WK"
run_lane java   "httpserver(stdlib)"  "java -cp '$H' RealServer $PORT $WK"
run_lane erlang "gen_tcp(handrolled)" "erl -noshell -pa '$H' -eval 'real_server:start($PORT,$WK)'"
run_lane ruby   "Puma(production)"    "ruby '$H/real_server.rb' $PORT $WK"
run_lane python "http.server(stdlib)" "python3 '$H/real_server.py' $PORT"
say ""
say "Load at end: $(cat /proc/loadavg)"
say "NOTE: production stacks (Go/Node/Hey/Ruby-Puma) vs stdlib/hand-rolled (C/Rust/Java/Python/Erlang);"
say "cross-lane = same workload, each language's readily-available server — NOT a tuned deployment."
say "server artifact bytes: hey=$(stat -c %s "$T/hey_srv" 2>/dev/null) go=$(stat -c %s "$T/go_srv" 2>/dev/null) c=$(stat -c %s "$T/c_srv" 2>/dev/null) rust=$(stat -c %s "$T/rust_srv" 2>/dev/null)"
rm -rf "$T"

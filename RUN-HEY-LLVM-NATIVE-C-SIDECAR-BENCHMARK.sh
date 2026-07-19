#!/usr/bin/env bash
set -euo pipefail

BUILD_ID="2026-07-18-packages-index-llvm-head-to-head-v2"

REPO="${1:-$HOME/dev/jayteesf.github.io}"
PACKAGES_DIR="${PACKAGES_DIR:-$REPO/packages}"
HEY_ROOT="${HEY_ROOT:-$HOME/dev/hey-lang-bootstrap-plan}"
HEYC="${HEYC:-$HEY_ROOT/bin/heyc}"
HEY_SOURCE="${HEY_SOURCE:-$REPO/generate-packages-index.hey}"
RUBY_SOURCE="${RUBY_SOURCE:-$REPO/generate-packages-index.rb}"

LLVM_BACKEND="${LLVM_BACKEND:-llvm}"
NATIVE_C_BACKEND="${NATIVE_C_BACKEND:-native-c}"

WARMUP="${WARMUP:-3}"
RUNS="${RUNS:-30}"
SIDECAR_WARMUP="${SIDECAR_WARMUP:-3}"
SIDECAR_RUNS="${SIDECAR_RUNS:-30}"
COLD_WARMUP="${COLD_WARMUP:-1}"
COLD_RUNS="${COLD_RUNS:-10}"
SIDECAR_WORKERS="${SIDECAR_WORKERS:-1}"

BENCH_TIMESTAMP="${BENCH_TIMESTAMP:-2000-01-01T00:00:00Z}"

RUN_STAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
RESULTS_DIR="${RESULTS_DIR:-$HOME/Downloads/hey-packages-llvm-benchmark-$RUN_STAMP}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hey-packages-llvm-benchmark.XXXXXX")"

INDEX_PATH="$PACKAGES_DIR/index.html"
INDEX_BACKUP="$WORK_DIR/index.html.original"
INDEX_EXISTED=false

SOURCE_COPY="$WORK_DIR/generate-packages-index-main.hey"
LLVM_BINARY="$WORK_DIR/generate-packages-index-llvm"
NATIVE_C_BINARY="$WORK_DIR/generate-packages-index-native-c"

WARM_SOURCE_DIR="$WORK_DIR/warm-source"
WARM_SOURCE="$WARM_SOURCE_DIR/generate-packages-index-main.hey"
COLD_SOURCE_DIR="$WORK_DIR/cold-source"
COLD_SOURCE="$COLD_SOURCE_DIR/generate-packages-index-main.hey"

RUBY_BASELINE="$WORK_DIR/from-ruby.html"

overall_status=0

cleanup() {
  status=$?

  if [ "$INDEX_EXISTED" = true ]; then
    cp -p "$INDEX_BACKUP" "$INDEX_PATH"
  else
    rm -f "$INDEX_PATH"
  fi

  rm -rf "$WORK_DIR"

  if [ "$status" -ne 0 ]; then
    exit "$status"
  fi

  exit "$overall_status"
}
trap cleanup EXIT INT TERM

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

warn() {
  echo "WARNING: $*" >&2
}

require_file() {
  [ -f "$1" ] || fail "missing file: $1"
}

require_executable() {
  [ -x "$1" ] || fail "missing executable: $1"
}

shell_quote() {
  printf '%q' "$1"
}

monotonic_now() {
  ruby -e 'puts Process.clock_gettime(Process::CLOCK_MONOTONIC)'
}

elapsed_seconds() {
  ruby -e 'start, finish = ARGV.map(&:to_f); printf("%.6f", finish - start)' "$1" "$2"
}

write_tree_manifest() {
  root="$1"
  destination="$2"

  ruby -rdigest -e '
    root = File.expand_path(ARGV.fetch(0))
    destination = ARGV.fetch(1)

    rows = Dir.glob(File.join(root, "**", "*"), File::FNM_DOTMATCH)
      .reject { |path| [".", ".."].include?(File.basename(path)) }
      .select { |path| File.file?(path) }
      .sort
      .map do |path|
        relative = path.delete_prefix(root + "/")
        "#{Digest::SHA256.file(path).hexdigest}  #{relative}"
      end

    File.write(destination, rows.join("\n") + (rows.empty? ? "" : "\n"))
  ' "$root" "$destination"
}

build_backend() {
  label="$1"
  backend="$2"
  output="$3"
  log="$4"
  duration_file="$5"

  echo
  echo "== Build $label backend ($backend) =="

  start="$(monotonic_now)"

  if (
    cd "$REPO"
    export HEY_ROOT
    export HEY_STDLIB_PATH="${HEY_STDLIB_PATH:-$HEY_ROOT/stdlib}"

    "$HEYC" build \
      --backend "$backend" \
      "$SOURCE_COPY" \
      -o "$output"
  ) >"$log" 2>&1; then
    finish="$(monotonic_now)"
    elapsed="$(elapsed_seconds "$start" "$finish")"
    printf '%s\n' "$elapsed" >"$duration_file"

    cat "$log"
    echo "$label build_seconds=$elapsed"
    return 0
  fi

  finish="$(monotonic_now)"
  elapsed="$(elapsed_seconds "$start" "$finish")"
  printf '%s\n' "$elapsed" >"$duration_file"

  cat "$log" >&2
  warn "$label backend build failed after ${elapsed}s; the remaining benchmark will continue."
  return 1
}

verify_output_parity() {
  label="$1"
  command="$2"
  log="$3"

  echo
  echo "== Verify $label output parity =="

  if bash -c "$command" >"$log" 2>&1; then
    cp "$INDEX_PATH" "$WORK_DIR/current-output.html"

    if cmp -s "$RUBY_BASELINE" "$WORK_DIR/current-output.html"; then
      echo "PASS: $label output matches Ruby byte-for-byte."
      return 0
    fi

    diff -u "$RUBY_BASELINE" "$WORK_DIR/current-output.html" \
      >"$RESULTS_DIR/${label// /-}-parity.diff" || true

    warn "$label produced different HTML; excluded from runtime comparison."
    return 1
  fi

  cat "$log" >&2
  warn "$label could not execute; excluded from runtime comparison."
  return 1
}

command -v ruby >/dev/null 2>&1 || fail "Ruby is required."
command -v hyperfine >/dev/null 2>&1 || fail "hyperfine is required. Install it with: brew install hyperfine"
command -v shasum >/dev/null 2>&1 || fail "shasum is required."
command -v sysctl >/dev/null 2>&1 || fail "sysctl is required."
command -v find >/dev/null 2>&1 || fail "find is required."

[ -d "$REPO" ] || fail "repository does not exist: $REPO"
[ -d "$PACKAGES_DIR" ] || fail "packages directory does not exist: $PACKAGES_DIR"
require_file "$HEY_SOURCE"
require_file "$RUBY_SOURCE"
require_executable "$HEYC"

mkdir -p "$RESULTS_DIR" "$WARM_SOURCE_DIR" "$COLD_SOURCE_DIR"
cp -p "$HEY_SOURCE" "$SOURCE_COPY"
cp -p "$HEY_SOURCE" "$WARM_SOURCE"
cp -p "$HEY_SOURCE" "$COLD_SOURCE"

if [ -f "$INDEX_PATH" ]; then
  cp -p "$INDEX_PATH" "$INDEX_BACKUP"
  INDEX_EXISTED=true
fi

package_count="$(
  find "$PACKAGES_DIR" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    ! -name '.*' \
    -print |
    wc -l |
    tr -d ' '
)"

[ "$package_count" -gt 0 ] || fail "no package directories found in $PACKAGES_DIR"

logical_cpus="$(sysctl -n hw.logicalcpu 2>/dev/null || sysctl -n hw.ncpu)"
max_workers="$logical_cpus"

if [ "$max_workers" -gt 16 ]; then
  max_workers=16
fi
if [ "$max_workers" -gt "$package_count" ]; then
  max_workers="$package_count"
fi
if [ "$max_workers" -lt 1 ]; then
  max_workers=1
fi

worker_candidates=(1 2 4 6 8 10 12 "$max_workers")
workers=()

for candidate in "${worker_candidates[@]}"; do
  if [ "$candidate" -le "$max_workers" ]; then
    duplicate=false

    for existing in "${workers[@]:-}"; do
      if [ "$existing" -eq "$candidate" ]; then
        duplicate=true
        break
      fi
    done

    if [ "$duplicate" = false ]; then
      workers+=("$candidate")
    fi
  fi
done

if [ "${#workers[@]}" -eq 0 ]; then
  workers=(1)
fi

machine_note="Apple M3 MacBook Pro; macOS Tahoe 26.5.2 (25F84); 18 GB RAM; 12 cores (6 performance and 6 efficiency)"

"$HEYC" --help >"$RESULTS_DIR/heyc-help.txt" 2>&1 || true
"$HEYC" build --help >"$RESULTS_DIR/heyc-build-help.txt" 2>&1 || true

{
  echo "Hey package-index LLVM/native-C benchmark"
  echo "build_id=$BUILD_ID"
  echo "run_utc=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "repo=$REPO"
  echo "packages_dir=$PACKAGES_DIR"
  echo "package_count=$package_count"
  echo "hey_root=$HEY_ROOT"
  echo "heyc=$HEYC"
  echo "hey_source=$HEY_SOURCE"
  echo "ruby_source=$RUBY_SOURCE"
  echo "llvm_backend=$LLVM_BACKEND"
  echo "native_c_backend=$NATIVE_C_BACKEND"
  echo "runtime_warmup=$WARMUP"
  echo "runtime_runs=$RUNS"
  echo "sidecar_warmup=$SIDECAR_WARMUP"
  echo "sidecar_runs=$SIDECAR_RUNS"
  echo "cold_warmup=$COLD_WARMUP"
  echo "cold_runs=$COLD_RUNS"
  echo "sidecar_workers=$SIDECAR_WORKERS"
  echo "benchmark_timestamp=$BENCH_TIMESTAMP"
  echo "compiled_workers=${workers[*]}"
  echo "user_supplied_machine_note=$machine_note"
  echo
  echo "== sw_vers =="
  sw_vers
  echo
  echo "== uname =="
  uname -a
  echo
  echo "== hardware =="
  echo "cpu_brand=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || true)"
  echo "logical_cpu=$(sysctl -n hw.logicalcpu 2>/dev/null || true)"
  echo "physical_cpu=$(sysctl -n hw.physicalcpu 2>/dev/null || true)"
  echo "performance_level_0_cpu=$(sysctl -n hw.perflevel0.physicalcpu 2>/dev/null || true)"
  echo "performance_level_1_cpu=$(sysctl -n hw.perflevel1.physicalcpu 2>/dev/null || true)"
  echo "memory_bytes=$(sysctl -n hw.memsize 2>/dev/null || true)"
  echo
  echo "== tool versions =="
  echo "ruby=$(ruby --version)"
  echo "hyperfine=$(hyperfine --version)"
  echo "heyc=$("$HEYC" --version 2>/dev/null || true)"
} | tee "$RESULTS_DIR/system-info.txt"

echo
echo "== Package directories =="
find "$PACKAGES_DIR" \
  -mindepth 1 \
  -maxdepth 1 \
  -type d \
  ! -name '.*' \
  -print |
  sort |
  tee "$RESULTS_DIR/package-directories.txt"

echo
echo "== Generate Ruby parity baseline =="

PACKAGES_INDEX_GENERATED_AT="$BENCH_TIMESTAMP" \
  ruby "$RUBY_SOURCE" "$PACKAGES_DIR" \
  >"$RESULTS_DIR/ruby-baseline.log" 2>&1

cp "$INDEX_PATH" "$RUBY_BASELINE"

{
  echo "ruby_output_sha256=$(shasum -a 256 "$RUBY_BASELINE" | awk '{print $1}')"
  echo "ruby_output_bytes=$(wc -c < "$RUBY_BASELINE" | tr -d ' ')"
} | tee "$RESULTS_DIR/parity-baseline.txt"

llvm_built=false
native_c_built=false
llvm_runnable=false
native_c_runnable=false
warm_source_runnable=false
cold_source_runnable=false

if build_backend \
  "LLVM" \
  "$LLVM_BACKEND" \
  "$LLVM_BINARY" \
  "$RESULTS_DIR/build-llvm.log" \
  "$RESULTS_DIR/build-llvm-seconds.txt"
then
  llvm_built=true
else
  overall_status=2
fi

if build_backend \
  "native-C" \
  "$NATIVE_C_BACKEND" \
  "$NATIVE_C_BINARY" \
  "$RESULTS_DIR/build-native-c.log" \
  "$RESULTS_DIR/build-native-c-seconds.txt"
then
  native_c_built=true
else
  overall_status=2
fi

: >"$RESULTS_DIR/build-artifacts.txt"

if [ "$llvm_built" = true ]; then
  {
    echo "LLVM"
    echo "  path=$LLVM_BINARY"
    echo "  bytes=$(wc -c < "$LLVM_BINARY" | tr -d ' ')"
    echo "  sha256=$(shasum -a 256 "$LLVM_BINARY" | awk '{print $1}')"
    echo "  file=$(file "$LLVM_BINARY")"
  } | tee -a "$RESULTS_DIR/build-artifacts.txt"
fi

if [ "$native_c_built" = true ]; then
  {
    echo "native-C"
    echo "  path=$NATIVE_C_BINARY"
    echo "  bytes=$(wc -c < "$NATIVE_C_BINARY" | tr -d ' ')"
    echo "  sha256=$(shasum -a 256 "$NATIVE_C_BINARY" | awk '{print $1}')"
    echo "  file=$(file "$NATIVE_C_BINARY")"
  } | tee -a "$RESULTS_DIR/build-artifacts.txt"
fi

quoted_packages="$(shell_quote "$PACKAGES_DIR")"
quoted_timestamp="$(shell_quote "$BENCH_TIMESTAMP")"

if [ "$llvm_built" = true ]; then
  quoted_binary="$(shell_quote "$LLVM_BINARY")"
  llvm_parity_command="PACKAGES_INDEX_GENERATED_AT=$quoted_timestamp $quoted_binary --workers 1 $quoted_packages >/dev/null"

  if verify_output_parity \
    "LLVM compiled" \
    "$llvm_parity_command" \
    "$RESULTS_DIR/parity-llvm.log"
  then
    llvm_runnable=true
  else
    overall_status=2
  fi
fi

if [ "$native_c_built" = true ]; then
  quoted_binary="$(shell_quote "$NATIVE_C_BINARY")"
  native_c_parity_command="PACKAGES_INDEX_GENERATED_AT=$quoted_timestamp $quoted_binary --workers 1 $quoted_packages >/dev/null"

  if verify_output_parity \
    "native-C compiled" \
    "$native_c_parity_command" \
    "$RESULTS_DIR/parity-native-c.log"
  then
    native_c_runnable=true
  else
    overall_status=2
  fi
fi

echo
echo "== Prime isolated default heyc --run sidecar =="

write_tree_manifest "$WARM_SOURCE_DIR" "$RESULTS_DIR/warm-tree-before.txt"

quoted_heyc="$(shell_quote "$HEYC")"
quoted_warm_source="$(shell_quote "$WARM_SOURCE")"
warm_source_command="PACKAGES_INDEX_GENERATED_AT=$quoted_timestamp HEY_ROOT=$(shell_quote "$HEY_ROOT") HEY_STDLIB_PATH=$(shell_quote "${HEY_STDLIB_PATH:-$HEY_ROOT/stdlib}") $quoted_heyc $quoted_warm_source --run -- --workers $SIDECAR_WORKERS $quoted_packages >/dev/null"

if bash -c "$warm_source_command" >"$RESULTS_DIR/warm-prime-first.log" 2>&1; then
  write_tree_manifest "$WARM_SOURCE_DIR" "$RESULTS_DIR/warm-tree-after-first.txt"

  if bash -c "$warm_source_command" >"$RESULTS_DIR/warm-prime-second.log" 2>&1; then
    write_tree_manifest "$WARM_SOURCE_DIR" "$RESULTS_DIR/warm-tree-after-second.txt"

    if verify_output_parity \
      "warm default source run" \
      "$warm_source_command" \
      "$RESULTS_DIR/parity-warm-source.log"
    then
      warm_source_runnable=true
    else
      overall_status=2
    fi
  else
    cat "$RESULTS_DIR/warm-prime-second.log" >&2
    warn "second warm source run failed; warm sidecar benchmark will be skipped."
    overall_status=2
  fi
else
  cat "$RESULTS_DIR/warm-prime-first.log" >&2
  warn "initial default source run failed; sidecar benchmarks will be skipped."
  overall_status=2
fi

{
  echo "Files added or changed beside the isolated source after first run:"
  diff -u \
    "$RESULTS_DIR/warm-tree-before.txt" \
    "$RESULTS_DIR/warm-tree-after-first.txt" 2>/dev/null || true
  echo
  echo "Changes beside the isolated source between first and second runs:"
  diff -u \
    "$RESULTS_DIR/warm-tree-after-first.txt" \
    "$RESULTS_DIR/warm-tree-after-second.txt" 2>/dev/null || true
  echo
  echo "Note: an empty adjacent-file diff does not prove that Hey used no cache;"
  echo "the compiler may store cache data elsewhere."
} >"$RESULTS_DIR/sidecar-observation.txt"

cat "$RESULTS_DIR/sidecar-observation.txt"

PREPARE_COLD="$WORK_DIR/prepare-cold-source.sh"
RUN_COLD="$WORK_DIR/run-cold-source.sh"

cat >"$PREPARE_COLD" <<EOF
#!/usr/bin/env bash
set -euo pipefail
rm -rf $(shell_quote "$COLD_SOURCE_DIR")
mkdir -p $(shell_quote "$COLD_SOURCE_DIR")
cp -p $(shell_quote "$HEY_SOURCE") $(shell_quote "$COLD_SOURCE")
EOF
chmod 0755 "$PREPARE_COLD"

cat >"$RUN_COLD" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export HEY_ROOT=$(shell_quote "$HEY_ROOT")
export HEY_STDLIB_PATH=$(shell_quote "${HEY_STDLIB_PATH:-$HEY_ROOT/stdlib}")
export PACKAGES_INDEX_GENERATED_AT=$(shell_quote "$BENCH_TIMESTAMP")
exec $(shell_quote "$HEYC") \
  $(shell_quote "$COLD_SOURCE") \
  --run -- \
  --workers $(shell_quote "$SIDECAR_WORKERS") \
  $(shell_quote "$PACKAGES_DIR")
EOF
chmod 0755 "$RUN_COLD"

"$PREPARE_COLD"

if "$RUN_COLD" >"$RESULTS_DIR/cold-source-smoke.log" 2>&1; then
  cp "$INDEX_PATH" "$WORK_DIR/cold-source-output.html"

  if cmp -s "$RUBY_BASELINE" "$WORK_DIR/cold-source-output.html"; then
    cold_source_runnable=true
    echo "PASS: cold default source run output matches Ruby byte-for-byte."
  else
    diff -u "$RUBY_BASELINE" "$WORK_DIR/cold-source-output.html" \
      >"$RESULTS_DIR/cold-source-parity.diff" || true
    warn "cold default source run produced different HTML; cold benchmark will be skipped."
    overall_status=2
  fi
else
  cat "$RESULTS_DIR/cold-source-smoke.log" >&2
  warn "cold default source run failed; cold benchmark will be skipped."
  overall_status=2
fi

echo
echo "== Compiled runtime head-to-head =="

runtime_args=(
  --warmup "$WARMUP"
  --runs "$RUNS"
  --export-json "$RESULTS_DIR/runtime-results.json"
  --export-markdown "$RESULTS_DIR/runtime-results.md"
)

: >"$RESULTS_DIR/runtime-commands.txt"
runtime_command_count=0

if [ "$llvm_runnable" = true ]; then
  for worker_count in "${workers[@]}"; do
    name="LLVM compiled, $worker_count worker"
    if [ "$worker_count" -ne 1 ]; then
      name="${name}s"
    fi

    quoted_binary="$(shell_quote "$LLVM_BINARY")"
    command_text="PACKAGES_INDEX_GENERATED_AT=$quoted_timestamp $quoted_binary --workers $worker_count $quoted_packages >/dev/null"

    printf '%s\t%s\n' "$name" "$command_text" | tee -a "$RESULTS_DIR/runtime-commands.txt"
    runtime_args+=(--command-name "$name" "$command_text")
    runtime_command_count=$((runtime_command_count + 1))
  done
fi

if [ "$native_c_runnable" = true ]; then
  for worker_count in "${workers[@]}"; do
    name="native-C compiled, $worker_count worker"
    if [ "$worker_count" -ne 1 ]; then
      name="${name}s"
    fi

    quoted_binary="$(shell_quote "$NATIVE_C_BINARY")"
    command_text="PACKAGES_INDEX_GENERATED_AT=$quoted_timestamp $quoted_binary --workers $worker_count $quoted_packages >/dev/null"

    printf '%s\t%s\n' "$name" "$command_text" | tee -a "$RESULTS_DIR/runtime-commands.txt"
    runtime_args+=(--command-name "$name" "$command_text")
    runtime_command_count=$((runtime_command_count + 1))
  done
fi

ruby_command="PACKAGES_INDEX_GENERATED_AT=$quoted_timestamp ruby $(shell_quote "$RUBY_SOURCE") $quoted_packages >/dev/null"
printf '%s\t%s\n' "Ruby" "$ruby_command" | tee -a "$RESULTS_DIR/runtime-commands.txt"
runtime_args+=(--command-name "Ruby" "$ruby_command")
runtime_command_count=$((runtime_command_count + 1))

if [ "$runtime_command_count" -gt 0 ]; then
  if ! hyperfine "${runtime_args[@]}" | tee "$RESULTS_DIR/runtime-results.txt"; then
    warn "compiled runtime benchmark failed; inspect runtime-results.txt."
    overall_status=2
  fi
fi

echo
echo "== Warm sidecar/default-source benchmark =="

if [ "$warm_source_runnable" = true ]; then
  if ! hyperfine \
    --warmup "$SIDECAR_WARMUP" \
    --runs "$SIDECAR_RUNS" \
    --export-json "$RESULTS_DIR/warm-source-results.json" \
    --export-markdown "$RESULTS_DIR/warm-source-results.md" \
    --command-name "Hey source run, warm sidecar/default backend" \
    "$warm_source_command" |
    tee "$RESULTS_DIR/warm-source-results.txt"
  then
    warn "warm source benchmark failed; inspect warm-source-results.txt."
    overall_status=2
  fi
fi

echo
echo "== Cold sidecar/default-source benchmark =="

if [ "$cold_source_runnable" = true ]; then
  if ! hyperfine \
    --warmup "$COLD_WARMUP" \
    --runs "$COLD_RUNS" \
    --prepare "$(shell_quote "$PREPARE_COLD")" \
    --export-json "$RESULTS_DIR/cold-source-results.json" \
    --export-markdown "$RESULTS_DIR/cold-source-results.md" \
    --command-name "Hey source run, cold sidecar/default backend" \
    "$(shell_quote "$RUN_COLD") >/dev/null" |
    tee "$RESULTS_DIR/cold-source-results.txt"
  then
    warn "cold source benchmark failed; inspect cold-source-results.txt."
    overall_status=2
  fi
fi

echo
echo "== Generate article-ready summary =="

ruby -rjson -e '
  results_dir = ARGV.fetch(0)
  package_count = ARGV.fetch(1)
  warmup = ARGV.fetch(2)
  runs = ARGV.fetch(3)
  sidecar_runs = ARGV.fetch(4)
  cold_runs = ARGV.fetch(5)

  groups = []

  runtime_path = File.join(results_dir, "runtime-results.json")
  if File.file?(runtime_path)
    groups.concat(
      JSON.parse(File.read(runtime_path))
        .fetch("results")
        .map { |entry| entry.merge("group" => "compiled-runtime") }
    )
  end

  warm_path = File.join(results_dir, "warm-source-results.json")
  if File.file?(warm_path)
    groups.concat(
      JSON.parse(File.read(warm_path))
        .fetch("results")
        .map { |entry| entry.merge("group" => "warm-source") }
    )
  end

  cold_path = File.join(results_dir, "cold-source-results.json")
  if File.file?(cold_path)
    groups.concat(
      JSON.parse(File.read(cold_path))
        .fetch("results")
        .map { |entry| entry.merge("group" => "cold-source") }
    )
  end

  ruby_result = groups.find { |entry| entry.fetch("command") == "Ruby" }
  ruby_mean = ruby_result && ruby_result.fetch("mean")

  lines = []
  lines << "# LLVM vs native-C package-index benchmark"
  lines << ""
  lines << "- Packages: #{package_count}"
  lines << "- Compiled runtime: #{warmup} warm-up runs and #{runs} measured runs"
  lines << "- Warm source/sidecar: #{sidecar_runs} measured runs"
  lines << "- Cold source/sidecar: #{cold_runs} measured runs"
  lines << "- Machine: Apple M3 MacBook Pro"
  lines << "- OS: macOS Tahoe 26.5.2 (25F84)"
  lines << "- Memory: 18 GB RAM"
  lines << "- CPU: 12 cores (6 performance and 6 efficiency)"
  lines << "- Timestamp fixed at 2000-01-01T00:00:00Z for output parity"
  lines << ""

  build_rows = []
  {
    "LLVM" => "build-llvm-seconds.txt",
    "native-C" => "build-native-c-seconds.txt"
  }.each do |name, filename|
    path = File.join(results_dir, filename)
    next unless File.file?(path)

    build_rows << [name, File.read(path).strip]
  end

  unless build_rows.empty?
    lines << "## Build results"
    lines << ""
    lines << "| Backend | One observed build |"
    lines << "|---|---:|"
    build_rows.each do |name, seconds|
      lines << format("| %s | %.3f s |", name, seconds.to_f)
    end
    lines << ""
  end

  unless groups.empty?
    lines << "## Runtime results"
    lines << ""
    lines << "| Program | Mean | Standard deviation | Range | Relative to Ruby |"
    lines << "|---|---:|---:|---:|---:|"

    groups.each do |entry|
      name = entry.fetch("command")
      mean_ms = entry.fetch("mean") * 1000.0
      stddev_ms = entry.fetch("stddev") * 1000.0
      min_ms = entry.fetch("min") * 1000.0
      max_ms = entry.fetch("max") * 1000.0

      relative =
        if name == "Ruby"
          "Baseline"
        elsif ruby_mean
          ratio = ruby_mean / entry.fetch("mean")
          if ratio >= 1.0
            format("%.2f× faster", ratio)
          else
            format("%.2f× slower", 1.0 / ratio)
          end
        else
          "n/a"
        end

      lines << format(
        "| %s | %.1f ms | %.1f ms | %.1f–%.1f ms | %s |",
        name,
        mean_ms,
        stddev_ms,
        min_ms,
        max_ms,
        relative
      )
    end
  end

  File.write(
    File.join(results_dir, "article-results.md"),
    lines.join("\n") + "\n"
  )
' \
  "$RESULTS_DIR" \
  "$package_count" \
  "$WARMUP" \
  "$RUNS" \
  "$SIDECAR_RUNS" \
  "$COLD_RUNS"

cat "$RESULTS_DIR/article-results.md"

{
  echo "llvm_built=$llvm_built"
  echo "llvm_runnable=$llvm_runnable"
  echo "native_c_built=$native_c_built"
  echo "native_c_runnable=$native_c_runnable"
  echo "warm_source_runnable=$warm_source_runnable"
  echo "cold_source_runnable=$cold_source_runnable"
  echo "overall_status=$overall_status"
} | tee "$RESULTS_DIR/status.txt"

echo
echo "Benchmark complete."
echo "results_dir=$RESULTS_DIR"
echo
echo "Send me:"
echo "  $RESULTS_DIR/system-info.txt"
echo "  $RESULTS_DIR/article-results.md"
echo "  $RESULTS_DIR/runtime-results.txt"
echo "  $RESULTS_DIR/warm-source-results.txt"
echo "  $RESULTS_DIR/cold-source-results.txt"
echo "  $RESULTS_DIR/sidecar-observation.txt"
echo "  $RESULTS_DIR/status.txt"

if [ "$overall_status" -ne 0 ]; then
  echo
  echo "One or more modes failed, but all available results were preserved."
fi

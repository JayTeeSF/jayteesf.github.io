#!/usr/bin/env ruby
# frozen_string_literal: true

# Controller for the supported actor efficiency matrix. It checks the Hey
# checkout and plan, clears inherited HEY_/ERL_ variables, writes a receipt,
# runs the measuring scorecard (tools/actor_bench/efficiency_scorecard.rb in
# the Hey checkout, unchanged and run through its command line) and records
# whether the 36 supported cells passed.
require "digest"
require "json"
require "time"

ROOT = "<private-dir>"
SCRATCH = "<private-dir>"

def now_utc
  Time.now.utc.strftime("%Y-%m-%dT%H:%M:%S.%6N+00:00")
end

# One line, in the same layout as the original controller's printed JSON.
def line_json(value)
  case value
  when Hash then "{" + value.map { |k, v| "#{k.to_s.to_json}: #{line_json(v)}" }.join(", ") + "}"
  when Array then "[" + value.map { |v| line_json(v) }.join(", ") + "]"
  else JSON.generate(value, ascii_only: true)
  end
end

def write_receipt(path, state)
  File.write(path, JSON.pretty_generate(state, ascii_only: true) + "\n")
end

def git(*args)
  output = IO.popen(["git", "-C", ROOT, *args], &:read)
  raise "git #{args.join(' ')} failed" unless $?.success?
  output
end

def run_plan(scorecard, plan_path, output)
  system("ruby", scorecard, plan_path, output, out: File::NULL)
  summary_path = File.join(output, "summary.json")
  raise "scorecard exited #{$?.exitstatus} without #{summary_path}" unless File.file?(summary_path)
  JSON.parse(File.read(summary_path))
end

plan_path = File.join(SCRATCH, "supported-efficiency-plan.json")
plan = JSON.parse(File.read(plan_path))
head = git("rev-parse", "HEAD").strip
lane = plan["lanes"].find { |l| l["id"] == "hey600a_runtime" } or raise "plan has no hey600a_runtime lane"
raise "checkout HEAD #{head} is not the planned hey600a_runtime source" unless head == lane["source_sha"]
raise "checkout has uncommitted changes" unless git("status", "--porcelain").strip.empty?
ENV.keys.each do |key|
  ENV.delete(key) if key.start_with?("HEY_", "ERL_") || plan["sanitized_parent_environment"].include?(key)
end
scorecard = File.join(ROOT, "tools/actor_bench/efficiency_scorecard.rb")
receipt = File.join(SCRATCH, "supported-efficiency-controller.json")
result_path = File.join(SCRATCH, "supported-efficiency-results")
state = {
  "pid" => Process.pid, "source_sha" => head, "started" => now_utc, "state" => "RUNNING",
  "plan_sha256" => Digest::SHA256.file(plan_path).hexdigest, "output" => result_path,
  "log" => File.join(SCRATCH, "supported-efficiency.log"),
}
write_receipt(receipt, state)
puts line_json(state)
$stdout.flush
begin
  summary = run_plan(scorecard, plan_path, result_path)
  cells = summary["cells"]
  statuses = cells.map { |c| c["status"] }.tally
  actual = cells.reject { |c| %w[caf akka hey_cooperate_park].include?(c["lane"]) || c["case"] == "1brc" }
  raise "expected 63 cells with 36 supported, got #{cells.size} and #{actual.size}" unless cells.size == 63 && actual.size == 36

  passed = actual.all? { |c| c["status"] == "PASS" }
  state.update("state" => passed ? "COMPLETE" : "FAILED", "exit" => passed ? 0 : 1, "status_counts" => statuses,
               "finished" => now_utc,
               "scope" => "Supported actual36cells only;27explicitNOT_RUNcells do not qualify a complete release")
  write_receipt(receipt, state)
  puts line_json(state)
  $stdout.flush
  exit state["exit"]
rescue StandardError => e
  state.update("state" => "FAILED", "exit" => 1, "finished" => now_utc,
               "error" => e.full_message(highlight: false, order: :top))
  write_receipt(receipt, state)
  raise
end

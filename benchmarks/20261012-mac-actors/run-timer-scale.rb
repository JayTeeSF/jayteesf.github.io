#!/usr/bin/env ruby
# frozen_string_literal: true

# Controller for the timer-scaling study. Run from the Hey checkout. It clears
# inherited HEY_/ERL_ variables, checks every lane binary against the plan,
# writes a receipt, runs the measuring scorecard
# (tools/actor_bench/efficiency_scorecard.rb, unchanged and run through its
# command line) and records whether every cell passed.
require "digest"
require "json"
require "time"

DIR = "<private-dir>"

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

def run_plan(scorecard, plan_path, output)
  system("ruby", scorecard, plan_path, output, out: File::NULL)
  summary_path = File.join(output, "summary.json")
  raise "scorecard exited #{$?.exitstatus} without #{summary_path}" unless File.file?(summary_path)
  JSON.parse(File.read(summary_path))
end

plan_path = File.join(DIR, "timer-scale-plan.json")
plan = JSON.parse(File.read(plan_path))
ENV.keys.each { |key| ENV.delete(key) if key.start_with?("HEY_", "ERL_") }
plan["lanes"].each do |lane|
  command = plan["cases"][0]["commands"][lane["id"]][0]
  raise "#{command} does not match the planned binary for #{lane['id']}" unless Digest::SHA256.file(command).hexdigest == lane["binary_sha256"]
end
scorecard = "tools/actor_bench/efficiency_scorecard.rb"
receipt = File.join(DIR, "timer-scale-controller.json")
state = { "pid" => Process.pid, "started" => now_utc, "state" => "RUNNING",
          "plan_sha256" => Digest::SHA256.file(plan_path).hexdigest }
write_receipt(receipt, state)
puts line_json(state)
$stdout.flush
begin
  summary = run_plan(scorecard, plan_path, File.join(DIR, "timer-scale-results"))
  okay = summary["cells"].all? { |c| c["status"] == "PASS" }
  state.update("state" => okay ? "COMPLETE" : "FAILED", "exit" => okay ? 0 : 1, "finished" => now_utc)
  write_receipt(receipt, state)
  puts line_json(state)
  $stdout.flush
  exit state["exit"]
rescue StandardError => e
  state.update("state" => "FAILED", "error" => e.full_message(highlight: false, order: :top))
  write_receipt(receipt, state)
  raise
end

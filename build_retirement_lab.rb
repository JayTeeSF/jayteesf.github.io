#!/usr/bin/env ruby
require 'json'
require 'erb'
require 'pathname'
require 'time'

root = Pathname.new(File.expand_path(File.dirname(__FILE__)))
template_path = root.join('retirement_scenario_lab_template.html.erb')
tax_path = Pathname.new(ARGV[0] || root.join('retirement_tax_tables_2025.json'))
defaults_path = Pathname.new(ARGV[1] || root.join('retirement_planner_defaults_v1.json'))
sample_path = Pathname.new(ARGV[2] || root.join('retirement_scenario_sample_default.json'))
output_path = Pathname.new(ARGV[3] || root.join('retirement_scenario_lab.html'))

embedded_tax_data_json = JSON.pretty_generate(JSON.parse(tax_path.read))
embedded_defaults_json = JSON.pretty_generate(JSON.parse(defaults_path.read))
embedded_sample_scenario_json = JSON.pretty_generate(JSON.parse(sample_path.read))
embedded_build_metadata_json = JSON.pretty_generate({
  built_at_utc: Time.now.utc.iso8601,
  template_file: template_path.basename.to_s,
  tax_file: tax_path.basename.to_s,
  defaults_file: defaults_path.basename.to_s,
  sample_file: sample_path.basename.to_s,
  output_file: output_path.basename.to_s
})

renderer = ERB.new(template_path.read, trim_mode: '-')
html = renderer.result(binding)
output_path.write(html)
puts "[OK] wrote #{output_path}"

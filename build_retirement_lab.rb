#!/usr/bin/env ruby
require 'json'
require 'erb'
require 'pathname'

root = Pathname.new(File.expand_path(File.dirname(__FILE__)))
template_path = root.join('retirement_scenario_lab_template.html.erb')
tax_path = Pathname.new(ARGV[0] || root.join('retirement_tax_tables_2025.json'))
defaults_path = Pathname.new(ARGV[1] || root.join('retirement_planner_defaults_v1.json'))
sample_path = Pathname.new(ARGV[2] || root.join('retirement_scenario_sample_default.json'))
output_path = Pathname.new(ARGV[3] || root.join('retirement_scenario_lab.html'))

embedded_tax_data_json = JSON.pretty_generate(JSON.parse(tax_path.read))
embedded_defaults_json = JSON.pretty_generate(JSON.parse(defaults_path.read))
embedded_sample_scenario_json = JSON.pretty_generate(JSON.parse(sample_path.read))

renderer = ERB.new(template_path.read, trim_mode: '-')
html = renderer.result(binding)
output_path.write(html)
puts "[OK] wrote #{output_path}"

#!/usr/bin/env ruby
require 'json'
require 'erb'
require 'pathname'
require 'optparse'
require 'time'

root = Pathname.new(File.expand_path(File.dirname(__FILE__)))
defaults = {
  template: root.join('retirement_scenario_lab_template.html.erb'),
  tax: root.join('retirement_tax_tables_2025.json'),
  planner_defaults: root.join('retirement_planner_defaults_v1.json'),
  sample: root.join('retirement_scenario_sample_default.json'),
  output: root.join('retirement_scenario_lab.html')
}
options = defaults.dup

OptionParser.new do |opts|
  opts.banner = 'Usage: ruby build_retirement_lab.rb [tax.json] [defaults.json] [sample.json] [output.html]'
  opts.on('--template PATH', 'ERB template path') { |v| options[:template] = Pathname.new(v) }
  opts.on('--tax PATH', 'Tax JSON path') { |v| options[:tax] = Pathname.new(v) }
  opts.on('--defaults PATH', 'Planner defaults JSON path') { |v| options[:planner_defaults] = Pathname.new(v) }
  opts.on('--sample PATH', 'Sample scenario JSON path') { |v| options[:sample] = Pathname.new(v) }
  opts.on('--output PATH', 'Output HTML path') { |v| options[:output] = Pathname.new(v) }
end.parse!(ARGV)

positionals = ARGV.dup
case positionals.length
when 1
  if positionals[0].end_with?('.html')
    options[:output] = Pathname.new(positionals[0])
  else
    options[:tax] = Pathname.new(positionals[0])
  end
when 2
  options[:tax] = Pathname.new(positionals[0])
  if positionals[1].end_with?('.html')
    options[:output] = Pathname.new(positionals[1])
  else
    options[:planner_defaults] = Pathname.new(positionals[1])
  end
when 3
  options[:tax] = Pathname.new(positionals[0])
  options[:planner_defaults] = Pathname.new(positionals[1])
  if positionals[2].end_with?('.html')
    options[:output] = Pathname.new(positionals[2])
  else
    options[:sample] = Pathname.new(positionals[2])
  end
when 4
  options[:tax] = Pathname.new(positionals[0])
  options[:planner_defaults] = Pathname.new(positionals[1])
  options[:sample] = Pathname.new(positionals[2])
  options[:output] = Pathname.new(positionals[3])
when 0
  # use defaults
else
  abort('Too many positional arguments.')
end

template_path = options[:template]
tax_path = options[:tax]
planner_defaults_path = options[:planner_defaults]
sample_path = options[:sample]
output_path = options[:output]

embedded_tax_data_json = JSON.pretty_generate(JSON.parse(tax_path.read))
embedded_defaults_json = JSON.pretty_generate(JSON.parse(planner_defaults_path.read))
embedded_sample_scenario_json = JSON.pretty_generate(JSON.parse(sample_path.read))
embedded_build_metadata_json = JSON.pretty_generate({
  built_at_utc: Time.now.utc.iso8601,
  template: template_path.basename.to_s,
  tax: tax_path.basename.to_s,
  planner_defaults: planner_defaults_path.basename.to_s,
  sample: sample_path.basename.to_s,
  output: output_path.basename.to_s
})

renderer = ERB.new(template_path.read, trim_mode: '-')
html = renderer.result(binding)
output_path.write(html)
puts "[OK] wrote #{output_path}"
puts "     template: #{template_path}"
puts "     tax: #{tax_path}"
puts "     defaults: #{planner_defaults_path}"
puts "     sample: #{sample_path}"

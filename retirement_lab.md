./build_retirement_lab.rb retirement_tax_tables_2025.json retirement_planner_defaults_v1.json jay_joy_scenario.json retirement_scenario_lab.html

relevant files:
retirement_lab.md # this documentation
jay_joy_expected_summary.json # expected output from fake-test data
jay_joy_scenario.json # fake-test data

build_retirement_lab.rb # script to process .erb file(s) & most-recent tax .json file(s)

retirement_scenario_lab_template.html.erb # erb to process
retirement_planner_defaults_v1.json # file to suggest how-to handle various scenarios
retirement_tax_tables_2025.json # most recent tax-year data, this should be replaced annually.
retirement_scenario_lab.html # (generated) output file


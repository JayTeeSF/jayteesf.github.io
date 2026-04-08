# Retirement Scenario Lab

Single-file HTML/CSS/JS retirement-planning sandbox inspired by the RightCapital tax-strategy workflow.

## Quick start

Build the default page with the embedded Joe & Tammy sample:

```bash
ruby build_retirement_lab.rb
```

Equivalent explicit command:

```bash
ruby build_retirement_lab.rb retirement_tax_tables_2025.json retirement_planner_defaults_v1.json retirement_scenario_sample_default.json retirement_scenario_lab.html
```

Build a 2026-preview page while still using the default Joe & Tammy sample:

```bash
ruby build_retirement_lab.rb retirement_tax_tables_2026_preview.json retirement_scenario_lab_2026_preview.html
```

Build with a custom scenario file:

```bash
ruby build_retirement_lab.rb retirement_tax_tables_2025.json retirement_planner_defaults_v1.json jay_joy_scenario.json retirement_scenario_lab.html
```

## Important behavior

- If you **omit the sample file**, the builder uses `retirement_scenario_sample_default.json`.
- This makes it safe to publish the page with fake/default data and then use **Import scenario** locally in the browser for personal numbers.
- The generated footer is populated from the embedded tax JSON metadata plus build metadata, so it updates automatically when you swap tax files and rebuild.

## What the app includes

- editable household and account snapshot inputs
- Roth-conversion scenario controls
- California / Texas / Georgia comparisons
- year-by-year detail table
- field-level help icons with explanations, examples, and where to get the data
- footer showing embedded tax-package metadata
- disclaimer stating the tool is not financial or tax advice

## Relevant files

- `retirement_lab.md` — this documentation
- `build_retirement_lab.rb` — ERB build script
- `retirement_scenario_lab_template.html.erb` — single-file HTML template
- `retirement_planner_defaults_v1.json` — planner heuristics / defaults
- `retirement_tax_tables_2025.json` — current 2025 package
- `retirement_tax_tables_2026_preview.json` — 2026 federal preview package with latest available CA/TX/GA handling
- `retirement_scenario_sample_default.json` — default Joe & Tammy sample embedded when no custom sample is supplied
- `jay_joy_scenario.json` — fake test data
- `jay_joy_expected_summary.json` — expected summary from fake test data
- `retirement_scenario_lab.html` — generated output (current default build)
- `retirement_scenario_lab_2026_preview.html` — generated output using the 2026 preview tax package

## Data notes

### Social Security annual fields

`spouse<N>SocialSecurityAnnual` means the **annual retirement benefit at the claiming age entered above**.

Example:
- monthly SSA estimate at age 67 = `$3,500`
- annual value entered into the tool = `$42,000`

Best source:
- your **my Social Security** account / statement
- or another official SSA estimate at the selected claiming age

### Cost basis

For taxable accounts, cost basis is critical because it determines how much gain is realized when assets are sold.

Examples:
- checking / cash: usually basis equals balance
- taxable brokerage: use custodian cost-basis reporting
- IRA / 401(k) / Roth: this prototype generally uses `0` because it models tax buckets rather than after-tax basis recovery mechanics

## Caveats

This is a **planning prototype**, not production tax software.

It does not fully model every real-world rule, including:
- all lot-level tax behavior
- all Social Security spousal/survivor edge cases
- all state residency edge cases
- every future tax-law change
- every timing convention used by commercial planning software

Users should verify scenarios with a qualified CPA / EA / CFP before acting on them.


## Income sources

`incomePlans` lets you model pre-retirement earnings and savings flows.

Key rules:
- use `sourceId` to identify the real-world income source
- if you split one salary across multiple rows, repeat the same `sourceId`
- gross income is counted **once per sourceId per year**
- directed contributions from those rows are then applied to the target accounts
- `endYear: 0` means “continue until the owner retires”

Example:

```json
{
  "sourceId": "joe-salary",
  "name": "Joe salary",
  "owner": "spouse1",
  "startYear": 2026,
  "endYear": 0,
  "annualIncome": 180000,
  "growthRate": 0.03,
  "taxTreatment": "ordinary",
  "contributionMode": "percent",
  "contributionValue": 0.10,
  "targetAccount": "Joint Taxable"
}
```

If you want the same salary to send another slice somewhere else, add a second row with the same `sourceId` and a different target account.

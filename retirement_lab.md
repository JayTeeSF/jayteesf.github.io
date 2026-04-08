# Retirement Scenario Lab

Single-file HTML/CSS/JS retirement-planning prototype with an ERB builder.

## What is implemented

- Tax module only; unused top-nav tabs are hidden until implemented
- Replaceable tax JSON packages
- Default embedded sample uses Joe/Tammy demo data
- Supports account types:
  - `checking`
  - `taxable`
  - `ira`
  - `roth`
  - `mortgage`
- Supports pre-retirement `incomePlans`
- Supports mortgage amortization inputs:
  - `annualReturn` as the mortgage rate
  - `termRemainingYears`
  - `scheduledAnnualPayment`
  - `extraAnnualPrincipal`

## Build

Default build using the shipped Joe/Tammy demo sample:

```bash
./build_retirement_lab.rb
```

Explicit 2025 build:

```bash
./build_retirement_lab.rb retirement_tax_tables_2025.json retirement_planner_defaults_v1.json retirement_scenario_sample_default.json retirement_scenario_lab.html
```

Explicit 2026-preview build:

```bash
./build_retirement_lab.rb retirement_tax_tables_2026_preview.json retirement_planner_defaults_v1.json retirement_scenario_sample_default.json retirement_scenario_lab_2026_preview.html
```

Custom sample build:

```bash
./build_retirement_lab.rb retirement_tax_tables_2025.json retirement_planner_defaults_v1.json jay_joy_scenario.json retirement_scenario_lab.html
```

## Relevant files

- `retirement_lab.md` — this documentation
- `retirement_scenario_lab_template.html.erb` — ERB template to process
- `build_retirement_lab.rb` — script to embed JSON data into the static page
- `retirement_tax_tables_2025.json` — current tax-year package; replace as tax law changes
- `retirement_tax_tables_2026_preview.json` — preview package for trying newer federal assumptions
- `retirement_planner_defaults_v1.json` — planner heuristics / defaults
- `retirement_scenario_sample_default.json` — default Joe/Tammy sample used when no sample file is supplied
- `jay_joy_scenario.json` — fake test data
- `jay_joy_expected_summary.json` — expected output from fake test data
- `retirement_scenario_lab.html` — generated static output
- `retirement_scenario_lab_2026_preview.html` — generated preview output
- `retirement_scenario_lab_package.zip` — packaged bundle of the current software

## Scenario JSON shape

```json
{
  "household": { "...": "..." },
  "accounts": [
    {
      "name": "Joint Taxable",
      "owner": "joint",
      "type": "taxable",
      "balance": 325000,
      "costBasis": 220000,
      "annualReturn": 0.05,
      "dividendYield": 0.015,
      "notes": "Embedded gain account"
    },
    {
      "name": "Home Mortgage",
      "owner": "joint",
      "type": "mortgage",
      "balance": 280000,
      "costBasis": 0,
      "annualReturn": 0.055,
      "termRemainingYears": 22,
      "scheduledAnnualPayment": 22252,
      "extraAnnualPrincipal": 0,
      "dividendYield": 0,
      "notes": "Outstanding principal owed"
    }
  ],
  "incomePlans": [
    {
      "name": "Joe salary",
      "owner": "spouse1",
      "startYear": 2026,
      "endYear": 0,
      "annualIncome": 185000,
      "growthRate": 0.03,
      "targetAccount": "Home Mortgage",
      "contributionMode": "amount",
      "contributionValue": 18000,
      "notes": "Pre-retirement principal paydown"
    },
    {
      "name": "Tammy salary",
      "owner": "spouse2",
      "startYear": 2026,
      "endYear": 0,
      "annualIncome": 98000,
      "growthRate": 0.025,
      "targetAccount": "Joint Taxable",
      "contributionMode": "percent",
      "contributionValue": 0.12,
      "notes": "Save 12% of pay"
    }
  ]
}
```

## Mortgage semantics

- Enter mortgage balance as the principal still owed, as a positive number.
- Mortgage balances reduce net worth.
- `annualReturn` is interpreted as the mortgage interest rate.
- If `scheduledAnnualPayment` is `0` and `termRemainingYears > 0`, the app estimates the annual payment from balance, rate, and term.
- `extraAnnualPrincipal` is treated as additional yearly principal reduction beyond the scheduled payment.
- Income plans directed to a mortgage account are also treated as extra principal payments.

## Pre-retirement income semantics

- `incomePlans` run while the selected owner is still pre-retirement, unless `endYear` is set.
- `contributionMode` may be:
  - `none`
  - `percent`
  - `amount`
- `contributionValue` is interpreted as either a decimal percent, for example `0.10`, or a dollar amount.
- `targetAccount` must match an existing account name exactly.

## Notes / limitations

- This is a planning prototype, not tax or financial advice.
- Only the Tax module is implemented; other modules are intentionally hidden.
- IRA / Roth contribution eligibility and annual IRS limits are not validated.
- Mortgage modeling is annualized, not a lender-grade monthly amortization schedule with escrow.
- Tax tables can be swapped by rebuilding with a different tax JSON or by importing a replacement tax JSON in the page UI.

# Holistic Financial Plan Builder

A guided web app that walks you through **Holistic Financial Planning** — the
process taught by the Savory Institute — and exports a complete take-home Excel
spreadsheet at the end. It's a teaching and working tool for ranchers, farmers,
and education hubs.

Everything happens in your browser. There is no backend, no account, and no
network calls — nothing you enter ever leaves your device. Your work is saved
automatically in the browser (localStorage), and the Excel workbook is generated
locally and downloaded directly.

## What it does

The app guides you through the full process in eight steps:

1. **Start** — name your business and capture your holistic context.
2. **Enterprises** — list each distinct income-generating activity.
3. **Take a hard look** — record logjams, adverse factors, weak links, and control plans.
4. **Plan enterprises** — enter income and categorized expenses for each enterprise.
5. **General & misc** — fixed costs and income that span enterprises.
6. **Plan profit** — set aside profit *first* (the Savory 50% default), capping expenses.
7. **Balance** — see the whole plan on one page and adjust until it balances.
8. **Review & export** — download an `.xlsx` workbook.

The exported workbook is structured as:

- **Info and SheetList**
- **Summaries** — the profit-first math, driven by live `SUMIF` formulas
- **Logjam Adv Factor Planning**
- **General Income and Expenses**
- One sheet **per enterprise** (with monthly columns and Return-to-Overhead totals)
- **All Items Table** — a flat list every summary draws from
- **Blank Enterprise** — a template for adding a new enterprise

A worked example, built from fabricated sample figures, is one click away.

## Bringing a plan back in

Export a plan, work on it in Excel through the year, then **Import spreadsheet**
to load it back in for an annual review. Import reads workbooks this app
exported — it reconstructs your enterprises, line items, preliminary-planning
notes, and the profit set-aside. Every line item can hold a full twelve months
of figures, so the detail you enter in Excel comes back intact. Expand any line
item in the planner to see and edit those twelve months directly; "spread
evenly" and "one month" are quick ways to fill them.

Importing other spreadsheets (ones this app didn't create) isn't supported yet.

## Feedback & ideas

This tool is built for the land-stewardship community, and your experience makes
it better. Something not working? Have an idea, or a question about how a part of
it works? We'd love to hear it.

The best place to reach us is **GitHub Discussions** — one spot for bug reports,
ideas, and questions alike:

**→ https://github.com/working-lands-lab/holistic-financial-plan-builder/discussions**

Posting needs a free GitHub account, which takes about a minute to set up. We read
everything that comes in, and we turn the bugs and ideas worth building into work
on the tool.

## Running it

```bash
npm install
npm run dev       # local dev server
npm run build     # -> dist/ (static; deployable as-is)
npm run preview   # serve the production build locally
```

## How the numbers work

Income is stored positive, expenses negative. The summary follows the holistic
logic exactly:

```
Return to Overhead = Inescapable + Logjam + Maintenance   (all negative)
Remaining Income   = Income + Return to Overhead           (must be positive)
Planned Profit     = profit % × Remaining Income           (taken off the top)
Reinvestment Fund  = Remaining Income − Planned Profit
Net Income         = Reinvestment Fund + Wealth Generating Expenses
```

## Notes

This implements Holistic Financial Planning as taught by the Savory Institute.
It is a planning aid, not financial advice.

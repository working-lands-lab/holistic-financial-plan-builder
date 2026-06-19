# AGENTS.md — Holistic Financial Plan Builder

Dev-agent guide for this repo. Brief and durable. Describes what the project is
and the persistent facts an agent needs before changing it. Edit when those facts
change — not for routine work.

## What this is

A web app that walks a land steward through building a **Holistic Financial Plan**
(the Savory financial-planning method: quality-of-life goal, enterprises, income and
expense line items, weak-link and adverse-factor analysis, a profit set-aside) and
exports the finished plan as an Excel workbook "take-home." It is a teaching and
working tool for ranchers, farmers, and education hubs in the Savory network and
beyond.

It is intentionally small and self-contained.

## How it works

- **Stack:** Vite + React with hand-written CSS. Plain client-side React — no router, no SSR.
- **Client-only.** There is no backend, no accounts, no analytics, no network calls.
  Nothing the user enters leaves their browser.
- **Persistence:** the working plan is saved to the browser's `localStorage`.
- **Export:** the Excel workbook is generated in-browser with [ExcelJS](https://github.com/exceljs/exceljs)
  and downloaded directly. ExcelJS is heavy and is **lazy-loaded on the export action**
  so it never blocks first paint.

### Source layout (the parts that matter)

- `lib/model.js` — plan calculations and the `uid()` helper. Framework-agnostic.
  A line item distributes its amount evenly, into a single month, or as an
  explicit 12-month array (`mode: "custom"`, `months: [...]`).
- `lib/exportWorkbook.js` — builds the Excel workbook from a plan object.
- `lib/importWorkbook.js` — reads a workbook this app exported back into a plan,
  so a plan can be carried out to Excel, edited, and brought back in. It only
  reads our own export format; importing arbitrary spreadsheets is not supported.
- `lib/defaultPlan.js` — `emptyPlan()` (blank starting point) and `examplePlan()`
  (the "Load example" worked sample).
- `components/` — the planner UI (`Planner`, `IssuesEditor`, `LineItemsEditor`).
- `*.test.js` next to the module they cover — run with Vitest (`npm test`).

## Build & run

```bash
npm install
npm run dev       # local dev server
npm run build     # -> dist/ (static; deployable as-is)
npm run preview   # serve the production build locally
npm test          # run the unit tests (Vitest)
```

## Durable facts an agent must respect

- **This repo is public. Never commit real client or organization financial data.**
  The bundled example plan (`lib/defaultPlan.js` → `examplePlan()`) is **fabricated
  illustrative data** ("Example Ranch & Education Hub"). Keep it that way. If you add
  or change example data, invent it — do not paste a real operating plan.

- **`vite.config.js` sets a non-root `base`.** The app is built to be served from a
  sub-path (the default matches the repo name, which suits a GitHub Pages project
  site), so asset URLs resolve relative to that base rather than the domain root. If
  you deploy at a domain root or a different path, update `base` to match — otherwise
  the built assets 404.

- **Stay generic.** This is a tool for the whole land-stewardship community, not one
  organization's plan. Avoid hard-coding any single hub's names, programs, or numbers
  into the app or its copy.

## Voice (for any user-facing text)

Short sentences, active voice, warm and direct. Describe what the tool does
("exports your plan as a spreadsheet"), not what it is ("AI-powered"). Write for
land-stewardship practitioners with zero assumed technical background.

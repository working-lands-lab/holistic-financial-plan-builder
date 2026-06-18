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

- **Stack:** Vite + React + Tailwind. Plain client-side React — no router, no SSR.
- **Client-only.** There is no backend, no accounts, no analytics, no network calls.
  Nothing the user enters leaves their browser.
- **Persistence:** the working plan is saved to the browser's `localStorage`.
- **Export:** the Excel workbook is generated in-browser with [ExcelJS](https://github.com/exceljs/exceljs)
  and downloaded directly. ExcelJS is heavy and is **lazy-loaded on the export action**
  so it never blocks first paint.

### Source layout (the parts that matter)

- `lib/model.js` — plan calculations and the `uid()` helper. Framework-agnostic.
- `lib/exportWorkbook.js` — builds the Excel workbook from a plan object.
- `lib/defaultPlan.js` — `emptyPlan()` (blank starting point) and `examplePlan()`
  (the "Load example" worked sample).
- `components/` — the planner UI (`Planner`, `IssuesEditor`, `LineItemsEditor`).

## Build & run

```bash
npm install
npm run dev       # local dev server
npm run build     # -> dist/ (static; deployable as-is)
npm run preview   # serve the production build locally
```

## Durable facts an agent must respect

- **This repo is PUBLIC. Never commit real client or organization financial data.**
  The bundled example plan (`lib/defaultPlan.js` → `examplePlan()`) is **fabricated
  illustrative data** ("Example Ranch & Education Hub"). Keep it that way. If you add
  or change example data, invent it — do not paste a real operating plan.

- **The Vite `base` is `/holistic-financial-plan-builder/` and must stay that way.**
  This app is embedded on the Savory AI Collab site under that path, and the same
  base also matches a GitHub Pages project-site path
  (`working-lands-lab.github.io/holistic-financial-plan-builder/`). Changing the base
  breaks the embedded deployment's asset URLs.

- **This repo is the source of truth; the collab site holds a built snapshot.** The
  Savory AI Collab site does not import this source. It copies a built `dist/` in via
  a one-shot sync script after you publish a change here. So a change is only "live"
  on the collab site once someone rebuilds here and runs that sync. Keep `npm run build`
  producing a clean `dist/index.html` + `dist/assets/…` under the base path above.

- **Stay generic.** This is a network-wide tool, not one organization's plan. Avoid
  hard-coding any single hub's names, programs, or numbers into the app or its copy.

## Voice (for any user-facing text)

Short sentences, active voice, warm and direct. Describe what the tool does
("exports your plan as a spreadsheet"), not what it is ("AI-powered"). Write for
land-stewardship practitioners with zero assumed technical background.

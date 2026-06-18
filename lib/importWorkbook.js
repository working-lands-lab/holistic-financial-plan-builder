// ABOUTME: Reads a workbook this app exported back into a plan object, so a
// ABOUTME: plan can be carried out to Excel, edited, and brought back in.

import ExcelJS from "exceljs";
import { TYPE_LIST, TYPES, ISSUE_TYPES, uid, clampPct } from "./model";

// Sheets that are not line-item sources.
const NON_ENTERPRISE_SHEETS = new Set([
  "Info and SheetList",
  "Summaries",
  "Logjam Adv Factor Planning",
  "All Items Table",
  "Blank Enterprise",
]);
const GENERAL_SHEET = "General Income and Expenses";

// ---------------------------------------------------------------------------
// Cell readers — tolerate plain values, formulas with cached results, and
// rich text.
// ---------------------------------------------------------------------------
function cellText(cell) {
  const v = cell && cell.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("");
    if (typeof v.text === "string") return v.text;
    if (v.result !== undefined && typeof v.result !== "object")
      return String(v.result);
    return "";
  }
  return String(v).trim();
}

function cellNumber(cell) {
  const v = cell && cell.value;
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v.result !== undefined) {
    const n = Number(v.result);
    return isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

// Finds the row number of the header row (the one whose first cell reads
// `label`) within the first `limit` rows. Returns 0 if not found.
function findHeaderRow(ws, label, limit = 20) {
  for (let r = 1; r <= Math.min(limit, ws.rowCount); r++) {
    if (cellText(ws.getCell(r, 1)) === label) return r;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Line items
// ---------------------------------------------------------------------------
// Turns the twelve signed monthly cell values into a model line item, picking
// the simplest faithful representation: an even spread, a single month, or an
// explicit per-month ("custom") distribution.
function itemFromMonths(type, name, assumptions, signedMonths) {
  const sign = TYPES[type].sign;
  const months = signedMonths.map((v) => sign * (Number(v) || 0));
  const total = months.reduce((a, b) => a + b, 0);
  const nonzero = months.filter((m) => m !== 0);

  const base = {
    id: uid("item"),
    type,
    item: name,
    assumptions: assumptions || "",
    amount: 0,
    mode: "even",
    month: 0,
    months: null,
  };

  if (nonzero.length === 0) return base;

  const allEqual = months.every((m) => Math.abs(m - months[0]) < 1e-9);
  if (allEqual) {
    return { ...base, mode: "even", amount: total };
  }
  if (nonzero.length === 1) {
    const month = months.findIndex((m) => m !== 0);
    return { ...base, mode: "single", month, amount: months[month] };
  }
  return { ...base, mode: "custom", amount: total, months };
}

// Reads the line items from an enterprise-style sheet (also used for the
// General sheet). Columns: A Type | B Item | C Assumptions | E..P Jan..Dec.
function readItems(ws) {
  const hr = findHeaderRow(ws, "Type");
  if (!hr) return [];
  const items = [];
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const type = cellText(ws.getCell(r, 1));
    if (!TYPE_LIST.includes(type)) break; // blank row or the Totals block
    const name = cellText(ws.getCell(r, 2));
    const assumptions = cellText(ws.getCell(r, 3));
    const signedMonths = [];
    for (let c = 5; c <= 16; c++) signedMonths.push(cellNumber(ws.getCell(r, c)));
    items.push(itemFromMonths(type, name, assumptions, signedMonths));
  }
  return items;
}

// ---------------------------------------------------------------------------
// Context (from the Info sheet) and issues (from the Logjam sheet)
// ---------------------------------------------------------------------------
function readContext(wb) {
  const ws = wb.getWorksheet("Info and SheetList");
  const ctx = {
    businessName: "",
    planningYear: new Date().getFullYear(),
    dateUpdated: new Date().toISOString().slice(0, 10),
    qualityOfLife: "",
    profitPct: 0.5,
  };
  if (!ws) return ctx;

  const byLabel = {};
  for (let r = 1; r <= Math.min(12, ws.rowCount); r++) {
    const label = cellText(ws.getCell(r, 1));
    if (label) byLabel[label] = ws.getCell(r, 2);
  }
  if (byLabel["Business / Hub:"]) ctx.businessName = cellText(byLabel["Business / Hub:"]);
  if (byLabel["Planning Year:"]) {
    const y = cellNumber(byLabel["Planning Year:"]);
    if (y) ctx.planningYear = y;
  }
  if (byLabel["Date Updated:"]) {
    const d = cellText(byLabel["Date Updated:"]);
    if (d) ctx.dateUpdated = d.slice(0, 10);
  }
  if (byLabel["Profit Set-Aside %:"])
    ctx.profitPct = clampPct(cellNumber(byLabel["Profit Set-Aside %:"]));
  if (byLabel["Quality of Life / Holistic Context:"])
    ctx.qualityOfLife = cellText(byLabel["Quality of Life / Holistic Context:"]);
  return ctx;
}

function readIssues(wb) {
  const ws = wb.getWorksheet("Logjam Adv Factor Planning");
  if (!ws) return [];
  const hr = findHeaderRow(ws, "Type");
  if (!hr) return [];
  const issues = [];
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const type = cellText(ws.getCell(r, 1));
    if (type === "Next Steps") break;
    if (!ISSUE_TYPES.includes(type)) continue;
    const title = cellText(ws.getCell(r, 3));
    if (!title || title === "None") continue;
    issues.push({
      id: uid("iss"),
      type,
      enterprise: cellText(ws.getCell(r, 2)),
      title,
      issue: cellText(ws.getCell(r, 4)),
      rootCause: cellText(ws.getCell(r, 5)),
      nextStep: cellText(ws.getCell(r, 6)),
      costOfNothing: cellText(ws.getCell(r, 7)),
      costOfResolving: cellText(ws.getCell(r, 8)),
    });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------
// Parses a workbook (ArrayBuffer/Buffer) exported by this app into a plan.
// Throws if the workbook isn't one we recognize.
export async function importWorkbook(data) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);

  if (!wb.getWorksheet("All Items Table") || !wb.getWorksheet("Info and SheetList")) {
    throw new Error(
      "This doesn't look like a plan exported by this app. Importing other spreadsheets isn't supported yet."
    );
  }

  const context = readContext(wb);

  const generalWs = wb.getWorksheet(GENERAL_SHEET);
  const general = { items: generalWs ? readItems(generalWs) : [] };

  const enterprises = [];
  wb.eachSheet((ws) => {
    if (NON_ENTERPRISE_SHEETS.has(ws.name) || ws.name === GENERAL_SHEET) return;
    const name = cellText(ws.getCell(1, 2)) || ws.name;
    enterprises.push({ id: uid("ent"), name, items: readItems(ws) });
  });
  if (enterprises.length === 0) {
    enterprises.push({ id: uid("ent"), name: "Enterprise 1", items: [] });
  }

  return { version: 1, context, issues: readIssues(wb), enterprises, general };
}

// ---------------------------------------------------------------------------
// Builds an .xlsx workbook for a Holistic Financial Plan, with these sheets:
//   Info and SheetList | Summaries | Logjam Adv Factor Planning |
//   General Income and Expenses | <one sheet per enterprise> |
//   All Items Table | Blank Enterprise
//
// Works in both the browser (Planner export button) and Node (verification),
// because ExcelJS runs in both environments.
// ---------------------------------------------------------------------------

import ExcelJS from "exceljs";
import {
  MONTHS,
  MONTHS_FULL,
  TYPE_LIST,
  ISSUE_TYPES,
  monthlyArray,
  clampPct,
} from "./model";

const MONEY_FMT = "#,##0;(#,##0)";
const PCT_FMT = "0.0%";
const ACCENT = "FF2F6F4F";
const HEAD_FILL = "FFEFF2F4";
const ZEBRA = "FFF7F8FA";

function colLetter(n) {
  // 1 -> A, 27 -> AA
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function titleCell(ws, addr, text) {
  const c = ws.getCell(addr);
  c.value = text;
  c.font = { bold: true, size: 14, color: { argb: ACCENT } };
  return c;
}

function headerRowStyle(ws, rowNumber, fromCol, toCol) {
  for (let i = fromCol; i <= toCol; i++) {
    const c = ws.getCell(`${colLetter(i)}${rowNumber}`);
    c.font = { bold: true, size: 10, color: { argb: "FF3A4150" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } };
    c.alignment = { vertical: "middle", wrapText: true };
    c.border = { bottom: { style: "thin", color: { argb: "FFCDD2DA" } } };
  }
}

// ---------------------------------------------------------------------------
// Enterprise-style sheet (also used for "General Income and Expenses" and the
// "Blank Enterprise" template).
// ---------------------------------------------------------------------------
// Columns: A Type | B Item | C Assumptions | D Annual Total Plan |
//          E..P Jan..Dec Plan | Q Annual Total Actual | R..AC Jan..Dec Actual
function buildEnterpriseSheet(wb, sheetName, displayName, items, plan, opts = {}) {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", xSplit: 3, ySplit: 6 }],
  });

  ws.getColumn(1).width = 24; // Type
  ws.getColumn(2).width = 30; // Item
  ws.getColumn(3).width = 30; // Assumptions
  ws.getColumn(4).width = 14; // Annual Total Plan
  for (let i = 5; i <= 16; i++) ws.getColumn(i).width = 10; // months plan
  ws.getColumn(17).width = 14; // Annual Total Actual
  for (let i = 18; i <= 29; i++) ws.getColumn(i).width = 10; // months actual

  titleCell(ws, "A1", opts.isBlank ? "Enterprise Worksheet" : "Enterprise Worksheet");
  ws.getCell("B1").value = displayName;
  ws.getCell("B1").font = { bold: true, size: 14 };

  ws.getCell("A2").value = "Date Plan Updated";
  ws.getCell("A2").font = { bold: true };
  ws.getCell("B2").value = plan.context.dateUpdated || "";
  ws.getCell("A3").value = "Planning Year";
  ws.getCell("A3").font = { bold: true };
  ws.getCell("B3").value = plan.context.planningYear || "";
  ws.getCell("A4").value =
    "Ensure all income is a POSITIVE NUMBER and all expenses are a NEGATIVE NUMBER.";
  ws.getCell("A4").font = { italic: true, size: 10, color: { argb: "FF8B94A3" } };

  // Header row (row 6)
  const HR = 6;
  const headers = [
    "Type",
    "Item",
    "Assumptions",
    "Annual Total Plan",
    ...MONTHS.map((m) => `${m} Plan`),
    "Annual Total Actual",
    ...MONTHS.map((m) => `${m} Actual`),
  ];
  headers.forEach((h, i) => {
    ws.getCell(`${colLetter(i + 1)}${HR}`).value = h;
  });
  headerRowStyle(ws, HR, 1, 29);

  // Item rows
  const firstItemRow = HR + 1;
  const rows = opts.isBlank ? [] : items;
  rows.forEach((it, idx) => {
    const r = firstItemRow + idx;
    const monthly = monthlyArray(it);
    ws.getCell(`A${r}`).value = it.type;
    ws.getCell(`B${r}`).value = it.item;
    ws.getCell(`C${r}`).value = it.assumptions || "";
    // Annual Total Plan = SUM(months)
    ws.getCell(`D${r}`).value = {
      formula: `SUM(E${r}:P${r})`,
    };
    monthly.forEach((v, m) => {
      const cell = ws.getCell(`${colLetter(5 + m)}${r}`);
      if (v !== 0) cell.value = v;
    });
    // Annual Total Actual = SUM(actual months)
    ws.getCell(`Q${r}`).value = { formula: `SUM(R${r}:AC${r})` };

    // number formats
    for (let cc = 4; cc <= 29; cc++) {
      ws.getCell(`${colLetter(cc)}${r}`).numFmt = MONEY_FMT;
    }
    if (idx % 2 === 1) {
      for (let cc = 1; cc <= 29; cc++) {
        ws.getCell(`${colLetter(cc)}${r}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ZEBRA },
        };
      }
    }
  });

  // For a blank template, leave a handful of empty formatted rows.
  const itemCount = opts.isBlank ? 12 : rows.length;
  if (opts.isBlank) {
    for (let idx = 0; idx < 12; idx++) {
      const r = firstItemRow + idx;
      ws.getCell(`D${r}`).value = { formula: `SUM(E${r}:P${r})` };
      ws.getCell(`Q${r}`).value = { formula: `SUM(R${r}:AC${r})` };
      for (let cc = 4; cc <= 29; cc++) {
        ws.getCell(`${colLetter(cc)}${r}`).numFmt = MONEY_FMT;
      }
    }
  }

  const lastItemRow = firstItemRow + Math.max(itemCount, 0) - 1;
  const safeLast = Math.max(lastItemRow, firstItemRow); // avoid empty range

  // ---- Totals by Type block ----
  const totalsTitleRow = safeLast + 2;
  ws.getCell(`A${totalsTitleRow}`).value = "Totals by Type";
  ws.getCell(`A${totalsTitleRow}`).font = { bold: true };
  ws.getCell(`D${totalsTitleRow}`).value = "Annual Total";
  ws.getCell(`D${totalsTitleRow}`).font = { bold: true };
  MONTHS_FULL.forEach((m, i) => {
    const c = ws.getCell(`${colLetter(5 + i)}${totalsTitleRow}`);
    c.value = m;
    c.font = { bold: true, size: 9 };
    c.alignment = { wrapText: true };
  });

  const typesPresent = TYPE_LIST.filter((t) =>
    rows.some((it) => it.type === t)
  );
  const typeRows = (opts.isBlank ? TYPE_LIST : typesPresent.length ? typesPresent : ["Income"]);
  let cursor = totalsTitleRow + 1;
  const typeRowStart = cursor;
  typeRows.forEach((t) => {
    ws.getCell(`A${cursor}`).value = t;
    ws.getCell(`A${cursor}`).font = { bold: false };
    // Annual + each month via SUMIF over the item rows
    const cols = [4, ...Array.from({ length: 12 }, (_, i) => 5 + i)];
    cols.forEach((cc) => {
      const L = colLetter(cc);
      ws.getCell(`${L}${cursor}`).value = {
        formula: `SUMIF($A$${firstItemRow}:$A$${safeLast},$A${cursor},${L}$${firstItemRow}:${L}$${safeLast})`,
      };
      ws.getCell(`${L}${cursor}`).numFmt = MONEY_FMT;
    });
    cursor++;
  });
  const typeRowEnd = cursor - 1;

  // Return to Overhead = sum of the type subtotals
  const rtoRow = cursor;
  ws.getCell(`A${rtoRow}`).value = "Return to Overhead";
  ws.getCell(`A${rtoRow}`).font = { bold: true };
  const cols = [4, ...Array.from({ length: 12 }, (_, i) => 5 + i)];
  cols.forEach((cc) => {
    const L = colLetter(cc);
    ws.getCell(`${L}${rtoRow}`).value = {
      formula: `SUM(${L}${typeRowStart}:${L}${typeRowEnd})`,
    };
    ws.getCell(`${L}${rtoRow}`).numFmt = MONEY_FMT;
    ws.getCell(`${L}${rtoRow}`).font = { bold: true };
  });

  // Return to Overhead % = RTO / Income (income type subtotal row, if any)
  const rtoPctRow = rtoRow + 1;
  ws.getCell(`A${rtoPctRow}`).value = "Return to Overhead %";
  ws.getCell(`A${rtoPctRow}`).font = { bold: true };
  ws.getCell(`C${rtoPctRow}`).value = "RTO / Income";
  ws.getCell(`C${rtoPctRow}`).font = { italic: true, size: 10 };
  // find the Income subtotal row within the type block
  const incomeIdx = typeRows.indexOf("Income");
  if (incomeIdx >= 0) {
    const incRow = typeRowStart + incomeIdx;
    ws.getCell(`D${rtoPctRow}`).value = {
      formula: `IFERROR(D${rtoRow}/D${incRow},0)`,
    };
    ws.getCell(`D${rtoPctRow}`).numFmt = PCT_FMT;
    ws.getCell(`D${rtoPctRow}`).font = { bold: true };
  }

  return ws;
}

// ---------------------------------------------------------------------------
// Info and SheetList
// ---------------------------------------------------------------------------
function buildInfoSheet(wb, plan) {
  const ws = wb.addWorksheet("Info and SheetList");
  ws.getColumn(1).width = 52;
  ws.getColumn(2).width = 64;
  titleCell(ws, "A1", "Holistic Financial Planning Spreadsheet");
  ws.getCell("A2").value = "Business / Hub:";
  ws.getCell("A2").font = { bold: true };
  ws.getCell("B2").value = plan.context.businessName || "(unnamed)";
  ws.getCell("A3").value = "Planning Year:";
  ws.getCell("A3").font = { bold: true };
  ws.getCell("B3").value = plan.context.planningYear || "";
  ws.getCell("A4").value = "Date Updated:";
  ws.getCell("A4").font = { bold: true };
  ws.getCell("B4").value = plan.context.dateUpdated || "";
  ws.getCell("A5").value = "Profit Set-Aside %:";
  ws.getCell("A5").font = { bold: true };
  ws.getCell("B5").value = clampPct(plan.context.profitPct);
  ws.getCell("B5").numFmt = PCT_FMT;
  ws.getCell("A6").value = "Quality of Life / Holistic Context:";
  ws.getCell("A6").font = { bold: true };
  ws.getCell("B6").value = plan.context.qualityOfLife || "";
  ws.getCell("B6").alignment = { wrapText: true, vertical: "top" };

  ws.getCell("A8").value = "List of Sheetnames";
  ws.getCell("A8").font = { bold: true };
  ws.getCell("B8").value = "What it's for";
  ws.getCell("B8").font = { bold: true };
  headerRowStyle(ws, 8, 1, 2);

  const rows = [
    ["Summaries", "The Holistic Financial Plan summary, with planned profit."],
    [
      "Logjam Adv Factor Planning",
      "Listing and planning for logjams, adverse factors, weak links, and control plans.",
    ],
    [
      "General Income and Expenses",
      "General income/expenses, items that span enterprises, and logjam/adverse-factor spending.",
    ],
    ...plan.enterprises.map((e) => [e.name, "Enterprise"]),
    ["All Items Table", "A flat report of every line item from all sheets."],
    ["Blank Enterprise", "Template for adding a new enterprise."],
  ];
  let r = 9;
  rows.forEach(([a, b]) => {
    ws.getCell(`A${r}`).value = a;
    ws.getCell(`B${r}`).value = b;
    r++;
  });
  r += 1;
  ws.getCell(`A${r}`).value =
    "Generated by the Holistic Financial Plan Builder. Process based on Holistic Financial Planning taught by the Savory Institute.";
  ws.getCell(`A${r}`).font = { italic: true, size: 10, color: { argb: "FF8B94A3" } };
  return ws;
}

// ---------------------------------------------------------------------------
// All Items Table (flat list every other sheet's summary draws from)
// ---------------------------------------------------------------------------
// A Source | B Type | C Item | D Assumptions | E Annual Total Plan |
// F..Q Jan..Dec Plan
function buildAllItemsTable(wb, plan) {
  const ws = wb.addWorksheet("All Items Table");
  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 30;
  ws.getColumn(4).width = 34;
  ws.getColumn(5).width = 15;
  for (let i = 6; i <= 17; i++) ws.getColumn(i).width = 10;

  titleCell(ws, "A1", "All Items Table");
  ws.getCell("A2").value =
    "A flat snapshot of every line item from the other sheets. The Summaries sheet sums this table by Type.";
  ws.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF8B94A3" } };

  const HR = 4;
  const headers = [
    "Source",
    "Type",
    "Item",
    "Assumptions",
    "Annual Total Plan",
    ...MONTHS.map((m) => `${m} Plan`),
  ];
  headers.forEach((h, i) => (ws.getCell(`${colLetter(i + 1)}${HR}`).value = h));
  headerRowStyle(ws, HR, 1, 17);

  // gather rows: general first, then each enterprise
  const flat = [];
  (plan.general.items || []).forEach((it) => {
    if (it.item || it.amount) flat.push({ source: "GeneralAndMisc", it });
  });
  plan.enterprises.forEach((ent) => {
    const src = (ent.name || "Enterprise").replace(/\s+/g, "");
    (ent.items || []).forEach((it) => {
      if (it.item || it.amount) flat.push({ source: src, it });
    });
  });

  let r = HR + 1;
  const dataStart = r;
  flat.forEach(({ source, it }) => {
    const monthly = monthlyArray(it);
    ws.getCell(`A${r}`).value = source;
    ws.getCell(`B${r}`).value = it.type;
    ws.getCell(`C${r}`).value = it.item;
    ws.getCell(`D${r}`).value = it.assumptions || "";
    ws.getCell(`E${r}`).value = { formula: `SUM(F${r}:Q${r})` };
    monthly.forEach((v, m) => {
      const c = ws.getCell(`${colLetter(6 + m)}${r}`);
      if (v !== 0) c.value = v;
    });
    for (let cc = 5; cc <= 17; cc++) ws.getCell(`${colLetter(cc)}${r}`).numFmt = MONEY_FMT;
    r++;
  });
  const dataEnd = Math.max(r - 1, dataStart);

  // Grand total row
  ws.getCell(`C${r + 1}`).value = "Grand Total";
  ws.getCell(`C${r + 1}`).font = { bold: true };
  ws.getCell(`E${r + 1}`).value = { formula: `SUM(E${dataStart}:E${dataEnd})` };
  ws.getCell(`E${r + 1}`).numFmt = MONEY_FMT;
  ws.getCell(`E${r + 1}`).font = { bold: true };

  return { typeCol: "B", amountCol: "E", dataStart, dataEnd };
}

// ---------------------------------------------------------------------------
// Summaries (the profit-first math, driven by SUMIF over All Items Table)
// ---------------------------------------------------------------------------
function buildSummariesSheet(wb, plan, ref) {
  const ws = wb.addWorksheet("Summaries");
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 62;

  titleCell(ws, "A1", "Holistic Financial Planning Summary");

  const HR = 3;
  ws.getCell(`A${HR}`).value = "Item";
  ws.getCell(`B${HR}`).value = "Planned Amount";
  ws.getCell(`C${HR}`).value = "Comments";
  headerRowStyle(ws, HR, 1, 3);

  const T = "'All Items Table'";
  const tc = ref.typeCol;
  const ac = ref.amountCol;
  const rng = (col) => `${T}!$${col}$${ref.dataStart}:$${col}$${ref.dataEnd}`;
  const sumif = (type) =>
    `SUMIF(${rng(tc)},"${type}",${rng(ac)})`;

  const pct = clampPct(plan.context.profitPct);

  const lines = [
    ["Income", { formula: sumif("Income") }, "Gross Income"],
    ["Inescapable Expense", { formula: sumif("Inescapable Expense") }, ""],
    ["Logjam Expense", { formula: sumif("Logjam Expense") }, ""],
    ["Maintenance Expense", { formula: sumif("Maintenance Expense") }, ""],
    [
      "Return to Overhead",
      { formula: "SUM(B5:B7)" },
      "Income taken to cover Inescapable, Logjam, and Maintenance expenses.",
    ],
    [
      "Remaining Income",
      { formula: "SUM(B4,B8)" },
      "What's left after overheads. Must be positive.",
    ],
    [
      `Planned Profit (${Math.round(pct * 100)}%)`,
      { formula: `${pct}*B9` },
      "A non-negotiable amount taken out of remaining income.",
    ],
    [
      "Reinvestment Fund",
      { formula: "B9-B10" },
      "After profit, what's left to reinvest in weak links and adverse factors.",
    ],
    [
      "Wealth Generating Expenses",
      { formula: sumif("Wealth Generating Expense") },
      "Total of Wealth Generating Expenses.",
    ],
    [
      "Net Income",
      { formula: "B12+B11" },
      "Excess (or shortfall) under the current plan and profit level.",
    ],
  ];

  let r = 4;
  lines.forEach(([label, val, comment], i) => {
    ws.getCell(`A${r}`).value = label;
    ws.getCell(`B${r}`).value = val;
    ws.getCell(`B${r}`).numFmt = MONEY_FMT;
    ws.getCell(`C${r}`).value = comment;
    ws.getCell(`C${r}`).font = { size: 10, color: { argb: "FF8B94A3" } };
    ws.getCell(`C${r}`).alignment = { wrapText: true };
    // emphasize key lines
    if (["Return to Overhead", "Remaining Income", "Planned Profit", "Net Income"].some((k) => label.startsWith(k))) {
      ws.getCell(`A${r}`).font = { bold: true };
      ws.getCell(`B${r}`).font = { bold: true };
    }
    r++;
  });

  // Totals by Type reference block
  r += 1;
  ws.getCell(`A${r}`).value = "Totals by Type (from All Items Table)";
  ws.getCell(`A${r}`).font = { bold: true };
  r++;
  TYPE_LIST.forEach((t) => {
    ws.getCell(`A${r}`).value = t;
    ws.getCell(`B${r}`).value = { formula: sumif(t) };
    ws.getCell(`B${r}`).numFmt = MONEY_FMT;
    r++;
  });

  return ws;
}

// ---------------------------------------------------------------------------
// Logjam / Adverse Factor / Weak Link / Control Plan planning sheet
// ---------------------------------------------------------------------------
function buildIssuesSheet(wb, plan) {
  const ws = wb.addWorksheet("Logjam Adv Factor Planning");
  const widths = [18, 18, 24, 34, 30, 36, 22, 22];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  titleCell(ws, "A1", "Logjams, Adverse Factors, Weak Links, and Control Plans");
  ws.getCell("A2").value = "Date Plan Updated";
  ws.getCell("A2").font = { bold: true };
  ws.getCell("B2").value = plan.context.dateUpdated || "";
  ws.getCell("A3").value = "Planning Year";
  ws.getCell("A3").font = { bold: true };
  ws.getCell("B3").value = plan.context.planningYear || "";

  const HR = 6;
  const headers = [
    "Type",
    "Enterprise",
    "Title",
    "Issue Description",
    "Root Cause",
    "Next Step",
    "Est. Cost of Doing Nothing",
    "Est. Cost of Resolving",
  ];
  headers.forEach((h, i) => (ws.getCell(`${colLetter(i + 1)}${HR}`).value = h));
  headerRowStyle(ws, HR, 1, 8);

  let r = HR + 1;
  ISSUE_TYPES.forEach((typeName) => {
    const group = (plan.issues || []).filter((x) => x.type === typeName);
    if (group.length === 0) {
      ws.getCell(`A${r}`).value = typeName;
      ws.getCell(`C${r}`).value = "None";
      ws.getCell(`C${r}`).font = { italic: true, color: { argb: "FF8B94A3" } };
      r++;
    } else {
      group.forEach((it) => {
        ws.getCell(`A${r}`).value = it.type;
        ws.getCell(`B${r}`).value = it.enterprise || "";
        ws.getCell(`C${r}`).value = it.title || "";
        ws.getCell(`D${r}`).value = it.issue || "";
        ws.getCell(`E${r}`).value = it.rootCause || "";
        ws.getCell(`F${r}`).value = it.nextStep || "";
        ws.getCell(`G${r}`).value = it.costOfNothing || "";
        ws.getCell(`H${r}`).value = it.costOfResolving || "";
        for (let cc = 1; cc <= 8; cc++)
          ws.getCell(`${colLetter(cc)}${r}`).alignment = { wrapText: true, vertical: "top" };
        r++;
      });
    }
  });

  r += 1;
  ws.getCell(`A${r}`).value = "Next Steps";
  ws.getCell(`A${r}`).font = { bold: true };
  r++;
  const guide = [
    "These items do not flow automatically to the other sheets — you place the funded ones there manually.",
    'Weak Link fixes → the associated enterprise sheet, as a "Wealth Generating Expense".',
    'Logjam fixes → the General sheet, as a "Logjam Expense".',
    'Adverse Factor fixes → the General sheet, as a "Wealth Generating Expense".',
    'Control Plans → the appropriate enterprise or General, as a "Wealth Generating Expense".',
  ];
  guide.forEach((g) => {
    ws.getCell(`A${r}`).value = g;
    ws.getCell(`A${r}`).font = { size: 10, color: { argb: "FF5B6473" } };
    r++;
  });

  return ws;
}

// ---------------------------------------------------------------------------
// Top-level builder
// ---------------------------------------------------------------------------
export function buildWorkbook(plan) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Holistic Financial Plan Builder";
  wb.created = new Date();

  buildInfoSheet(wb, plan);

  // All Items Table must exist before Summaries references it, but we want
  // Summaries to appear right after Info. Build the table first (to compute
  // its data range), then move sheets into the desired order at the end.
  const ref = buildAllItemsTable(wb, plan);
  buildSummariesSheet(wb, plan, ref);
  buildIssuesSheet(wb, plan);
  buildEnterpriseSheet(wb, "General Income and Expenses", "General Income and Expenses", plan.general.items || [], plan);
  plan.enterprises.forEach((ent) => {
    const name = ent.name || "Enterprise";
    const sheetName = safeSheetName(name, wb);
    buildEnterpriseSheet(wb, sheetName, name, ent.items || [], plan);
  });
  buildEnterpriseSheet(wb, "Blank Enterprise", "(new enterprise)", [], plan, {
    isBlank: true,
  });

  // Reorder: Info, Summaries, Logjam, General, enterprises..., All Items, Blank
  reorderSheets(wb, [
    "Info and SheetList",
    "Summaries",
    "Logjam Adv Factor Planning",
    "General Income and Expenses",
    ...plan.enterprises.map((e) => safeSheetNameLookup(e.name, wb)),
    "All Items Table",
    "Blank Enterprise",
  ]);

  return wb;
}

// Excel sheet names: max 31 chars, no : \ / ? * [ ], must be unique.
function sanitize(name) {
  return (name || "Sheet").replace(/[:\\/?*[\]]/g, " ").slice(0, 31).trim() || "Sheet";
}
function safeSheetName(name, wb) {
  let base = sanitize(name);
  let n = base;
  let i = 2;
  while (wb.worksheets.some((w) => w.name === n)) {
    n = sanitize(`${base} ${i}`);
    i++;
  }
  return n;
}
// best-effort lookup of the (possibly de-duplicated) sheet name for ordering
function safeSheetNameLookup(name, wb) {
  const base = sanitize(name);
  const match = wb.worksheets.find((w) => w.name === base || w.name.startsWith(base));
  return match ? match.name : base;
}

function reorderSheets(wb, order) {
  order.forEach((name, idx) => {
    const ws = wb.worksheets.find((w) => w.name === name);
    if (ws) ws.orderNo = idx + 1;
  });
}

// Browser-only: build + trigger a download.
export async function downloadWorkbook(plan, filename) {
  const wb = buildWorkbook(plan);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "Holistic Financial Plan.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

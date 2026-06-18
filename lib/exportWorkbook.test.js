// ABOUTME: Tests for workbook formatting — accounting number format, cached
// ABOUTME: formula results, and the emphasis (bold/rules) on total rows.

import { describe, it, expect } from "vitest";
import { buildWorkbook } from "./exportWorkbook";
import { examplePlan } from "./defaultPlan";
import { summarize, itemAnnual } from "./model";

function rowByLabel(ws, label) {
  let found = 0;
  ws.eachRow((row, rn) => {
    if (!found && String(row.getCell(1).value).trim() === label) found = rn;
  });
  return found;
}

describe("workbook formatting", () => {
  const plan = examplePlan();
  const wb = buildWorkbook(plan);
  const s = summarize(plan);

  it("uses an accounting number format with a dollar sign and parenthesised negatives", () => {
    const ws = wb.getWorksheet("Summaries");
    const fmt = ws.getCell(`B${rowByLabel(ws, "Income")}`).numFmt;
    expect(fmt).toContain('"$"');
    expect(fmt).toContain("(#,##0)");
  });

  it("caches formula results so numbers show without recalculation", () => {
    const ws = wb.getWorksheet("Summaries");
    const income = ws.getCell(`B${rowByLabel(ws, "Income")}`).value;
    const net = ws.getCell(`B${rowByLabel(ws, "Net Income")}`).value;
    expect(income).toMatchObject({ formula: expect.any(String), result: s.income });
    expect(net).toMatchObject({ formula: expect.any(String), result: s.netIncome });
  });

  it("caches the annual total on each enterprise line item", () => {
    const ent = plan.enterprises[0];
    const ws = wb.getWorksheet(ent.name);
    const firstItem = ent.items[0];
    // header on row 6, items begin row 7
    expect(ws.getCell("D7").value).toMatchObject({
      formula: expect.any(String),
      result: itemAnnual(firstItem),
    });
  });

  it("emphasises the Net Income line", () => {
    const ws = wb.getWorksheet("Summaries");
    const r = rowByLabel(ws, "Net Income");
    expect(ws.getCell(`B${r}`).font.bold).toBe(true);
    expect(ws.getCell(`A${r}`).fill).toMatchObject({ type: "pattern" });
    expect(ws.getCell(`B${r}`).border.top).toBeTruthy();
  });
});

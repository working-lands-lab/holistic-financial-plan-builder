// ABOUTME: Round-trip tests — a plan exported to a workbook and imported back
// ABOUTME: must reproduce the same figures, enterprises, issues, and context.

import { describe, it, expect } from "vitest";
import { buildWorkbook } from "./exportWorkbook";
import { importWorkbook } from "./importWorkbook";
import { examplePlan } from "./defaultPlan";
import { summarize, itemAnnual, monthlyArray, uid } from "./model";

async function roundTrip(plan) {
  const wb = buildWorkbook(plan);
  const buffer = await wb.xlsx.writeBuffer();
  return importWorkbook(buffer);
}

describe("round-trip of the worked example", () => {
  it("reproduces the summary figures", async () => {
    const original = examplePlan();
    const back = await roundTrip(original);

    const a = summarize(original);
    const b = summarize(back);
    expect(b.income).toBeCloseTo(a.income, 2);
    expect(b.returnToOverhead).toBeCloseTo(a.returnToOverhead, 2);
    expect(b.remainingIncome).toBeCloseTo(a.remainingIncome, 2);
    expect(b.plannedProfit).toBeCloseTo(a.plannedProfit, 2);
    expect(b.netIncome).toBeCloseTo(a.netIncome, 2);
  });

  it("reproduces context, enterprises, and issues", async () => {
    const original = examplePlan();
    const back = await roundTrip(original);

    expect(back.context.businessName).toBe(original.context.businessName);
    expect(back.context.planningYear).toBe(original.context.planningYear);
    expect(back.context.profitPct).toBeCloseTo(original.context.profitPct, 4);
    expect(back.context.qualityOfLife).toBe(original.context.qualityOfLife);
    expect(back.context.dateUpdated).toBe(original.context.dateUpdated);

    expect(back.enterprises.map((e) => e.name)).toEqual(
      original.enterprises.map((e) => e.name)
    );
    expect(back.issues.map((i) => i.title).sort()).toEqual(
      original.issues.map((i) => i.title).sort()
    );
    expect(back.issues[0]).toMatchObject({
      type: expect.any(String),
      enterprise: expect.any(String),
      nextStep: expect.any(String),
    });
  });

  it("preserves every enterprise's annual return to overhead", async () => {
    const original = examplePlan();
    const back = await roundTrip(original);

    const annualByName = (plan) =>
      Object.fromEntries(
        plan.enterprises.map((e) => [
          e.name,
          e.items.reduce((sum, it) => sum + itemAnnual(it), 0),
        ])
      );
    const oa = annualByName(original);
    const ba = annualByName(back);
    for (const name of Object.keys(oa)) {
      expect(ba[name]).toBeCloseTo(oa[name], 2);
    }
  });
});

describe("round-trip of explicit per-month items", () => {
  it("preserves a custom monthly distribution", async () => {
    const months = [100, 0, 250, 0, 0, 0, 0, 0, 0, 0, 75, 0];
    const plan = {
      version: 1,
      context: {
        businessName: "Monthly Test",
        planningYear: 2026,
        dateUpdated: "2026-01-15",
        qualityOfLife: "Test the months.",
        profitPct: 0.4,
      },
      issues: [],
      general: { items: [] },
      enterprises: [
        {
          id: uid("ent"),
          name: "Seasonal Sales",
          items: [
            {
              id: uid("item"),
              type: "Income",
              item: "Lamb",
              assumptions: "spring and fall",
              amount: 425,
              mode: "custom",
              month: 0,
              months,
            },
          ],
        },
      ],
    };

    const back = await roundTrip(plan);
    const item = back.enterprises[0].items[0];
    expect(item.mode).toBe("custom");
    expect(monthlyArray(item)).toEqual(months);
    expect(back.context.profitPct).toBeCloseTo(0.4, 4);
  });
});

describe("rejecting foreign workbooks", () => {
  it("throws a helpful error when the expected sheets are absent", async () => {
    const wb = new (await import("exceljs")).default.Workbook();
    wb.addWorksheet("Some Other Sheet");
    const buffer = await wb.xlsx.writeBuffer();
    await expect(importWorkbook(buffer)).rejects.toThrow(/exported by this app/);
  });
});

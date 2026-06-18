// ABOUTME: Tests for the plan data model — monthly distribution and aggregation.
// ABOUTME: Covers even, single-month, and explicit per-month ("custom") line items.

import { describe, it, expect } from "vitest";
import {
  monthlyArray,
  itemAnnual,
  normalizeMonths,
  newItem,
  summarize,
} from "./model";

describe("monthlyArray", () => {
  it("spreads an even item across all twelve months", () => {
    const arr = monthlyArray({ type: "Income", amount: 1200, mode: "even" });
    expect(arr).toHaveLength(12);
    arr.forEach((v) => expect(v).toBeCloseTo(100));
  });

  it("places a single-month item in the chosen month, signed", () => {
    const arr = monthlyArray({
      type: "Maintenance Expense",
      amount: 500,
      mode: "single",
      month: 2,
    });
    expect(arr[2]).toBe(-500);
    expect(arr.filter((v) => v !== 0)).toHaveLength(1);
  });

  it("reads explicit per-month magnitudes for a custom item, signed by type", () => {
    const months = [10, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30];
    const arr = monthlyArray({
      type: "Maintenance Expense",
      mode: "custom",
      months,
    });
    expect(arr[0]).toBe(-10);
    expect(arr[1]).toBe(-20);
    expect(arr[11]).toBe(-30);
    expect(arr[5]).toBe(0);
  });

  it("treats a custom income item's months as positive", () => {
    const arr = monthlyArray({
      type: "Income",
      mode: "custom",
      months: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    expect(arr[0]).toBe(5);
  });

  it("pads a short custom months array to twelve", () => {
    const arr = monthlyArray({ type: "Income", mode: "custom", months: [7] });
    expect(arr).toHaveLength(12);
    expect(arr[0]).toBe(7);
    expect(arr[11]).toBe(0);
  });
});

describe("itemAnnual", () => {
  it("sums a custom item's months, signed by type", () => {
    const ann = itemAnnual({
      type: "Maintenance Expense",
      mode: "custom",
      months: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50],
    });
    expect(ann).toBe(-150);
  });

  it("still uses amount for even items", () => {
    expect(itemAnnual({ type: "Income", amount: 900, mode: "even" })).toBe(900);
  });
});

describe("normalizeMonths", () => {
  it("returns twelve numeric entries, coercing junk to zero", () => {
    const out = normalizeMonths([1, "2", null, undefined, "x"]);
    expect(out).toHaveLength(12);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(2);
    expect(out[2]).toBe(0);
    expect(out[4]).toBe(0);
  });

  it("truncates an over-long array to twelve", () => {
    const out = normalizeMonths(new Array(20).fill(3));
    expect(out).toHaveLength(12);
  });
});

describe("summarize with custom items", () => {
  it("folds custom-month items into the totals like any other item", () => {
    const plan = {
      context: { profitPct: 0.5 },
      issues: [],
      general: { items: [] },
      enterprises: [
        {
          id: "e1",
          name: "Test",
          items: [
            { ...newItem("Income"), item: "Sales", mode: "custom", months: new Array(12).fill(100) },
            { ...newItem("Maintenance Expense"), item: "Feed", amount: 600, mode: "even" },
          ],
        },
      ],
    };
    const s = summarize(plan);
    expect(s.income).toBe(1200);
    expect(s.maintenance).toBe(-600);
    expect(s.returnToOverhead).toBe(-600);
    expect(s.remainingIncome).toBe(600);
  });
});

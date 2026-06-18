// ---------------------------------------------------------------------------
// Holistic Financial Plan — data model, constants, and calculations
// Based on the Savory Institute "Creating your Holistic Financial Plan"
// process.
// ---------------------------------------------------------------------------

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// The five expense/income types used throughout the plan. Order matters for
// presentation. `sign` tells us whether amounts are stored positive (income)
// or negative (expenses).
export const TYPES = {
  Income: { label: "Income", sign: 1, pill: "income", group: "income" },
  "Inescapable Expense": {
    label: "Inescapable Expense",
    sign: -1,
    pill: "inesc",
    group: "overhead",
  },
  "Logjam Expense": {
    label: "Logjam Expense",
    sign: -1,
    pill: "logjam",
    group: "overhead",
  },
  "Maintenance Expense": {
    label: "Maintenance Expense",
    sign: -1,
    pill: "maint",
    group: "overhead",
  },
  "Wealth Generating Expense": {
    label: "Wealth Generating Expense",
    sign: -1,
    pill: "wge",
    group: "wealth",
  },
};

export const TYPE_LIST = Object.keys(TYPES);

export const TYPE_HELP = {
  Income: "Money coming in from this enterprise (or miscellaneous income).",
  "Inescapable Expense":
    "Legally or morally obligated, fixed, non-negotiable — e.g. land tax, a debt to family.",
  "Logjam Expense":
    "Spending to clear a logjam blocking all progress. Funded before profit — the only exception to the profit-first rule.",
  "Maintenance Expense":
    "Keeps the business running at current income — labor, fuel, supplies, insurance, utilities. Most expenses live here.",
  "Wealth Generating Expense":
    "Spending that grows income soon — addressing weak links, adverse factors, marketing, infrastructure.",
};

export const ISSUE_TYPES = [
  "Logjam",
  "Adverse Factor",
  "Weak Link",
  "Control Plan",
];

export const ISSUE_TYPE_HELP = {
  Logjam:
    "The one thing blocking all progress toward your goals. Highest priority; funded before profit.",
  "Adverse Factor":
    "Reduces overall efficiency or productivity. Less urgent than a logjam, but could become one.",
  "Weak Link":
    "The weakest point in a single enterprise's chain — resource conversion, product conversion, or marketing.",
  "Control Plan":
    "A planned action to keep something on track once you've addressed it.",
};

// Maps an issue resolution to where its expense should be recorded.
export const ISSUE_EXPENSE_GUIDE = {
  Logjam: 'General sheet, as a "Logjam Expense".',
  "Adverse Factor": 'General sheet, as a "Wealth Generating Expense".',
  "Weak Link":
    'The associated enterprise, as a "Wealth Generating Expense".',
  "Control Plan":
    'The appropriate enterprise or General, as a "Wealth Generating Expense".',
};

let _id = 0;
export function uid(prefix = "id") {
  _id += 1;
  return `${prefix}_${Date.now().toString(36)}_${_id}`;
}

// ---------------------------------------------------------------------------
// Line item helpers
// ---------------------------------------------------------------------------
// A line item stores a positive `amount` (magnitude) plus a distribution mode.
// The signed monthly array is derived from type + amount + distribution.

export function newItem(type = "Maintenance Expense") {
  return {
    id: uid("item"),
    type,
    item: "",
    assumptions: "",
    amount: 0, // magnitude, always >= 0 in the UI
    mode: "even", // "even" | "single" | "custom"
    month: 0, // month index for "single"
    months: null, // 12 magnitudes for "custom" (signed by type when used)
  };
}

// Coerces any value into a 12-entry array of finite numbers. Missing or
// non-numeric entries become 0; extra entries are dropped.
export function normalizeMonths(months) {
  const arr = new Array(12).fill(0);
  if (!Array.isArray(months)) return arr;
  for (let i = 0; i < 12; i++) {
    const n = Number(months[i]);
    arr[i] = isFinite(n) ? n : 0;
  }
  return arr;
}

// Returns the signed 12-month array for an item. A "custom" item carries
// explicit per-month magnitudes; "even" and "single" derive from `amount`.
export function monthlyArray(item) {
  const sign = TYPES[item.type]?.sign ?? -1;
  if (item.mode === "custom") {
    return normalizeMonths(item.months).map((m) => sign * m || 0);
  }
  const mag = Number(item.amount) || 0;
  const signed = sign * mag;
  const arr = new Array(12).fill(0);
  if (signed === 0) return arr;
  if (item.mode === "single") {
    const m = Math.min(11, Math.max(0, Number(item.month) || 0));
    arr[m] = signed;
  } else {
    // even spread; keep totals exact by distributing the remainder
    const per = signed / 12;
    for (let i = 0; i < 12; i++) arr[i] = per;
  }
  return arr;
}

// Signed annual total for an item.
export function itemAnnual(item) {
  const sign = TYPES[item.type]?.sign ?? -1;
  if (item.mode === "custom") {
    const sum = normalizeMonths(item.months).reduce((a, b) => a + b, 0);
    return sign * sum;
  }
  return sign * (Number(item.amount) || 0);
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

// Flattens every line item across General + enterprises into a single list,
// tagging each with its source (used for the All Items Table & summary).
export function allItems(plan) {
  const out = [];
  const push = (source, item) => {
    if (!item.item && itemAnnual(item) === 0) return; // skip empty rows
    out.push({ source, ...item });
  };
  (plan.general.items || []).forEach((it) => push("GeneralAndMisc", it));
  (plan.enterprises || []).forEach((ent) => {
    const src = (ent.name || "Enterprise").replace(/\s+/g, "");
    (ent.items || []).forEach((it) => push(src, it));
  });
  return out;
}

// Sum signed annual totals for a given type across the whole plan.
export function totalByType(plan, type) {
  return allItems(plan).reduce(
    (acc, it) => (it.type === type ? acc + itemAnnual(it) : acc),
    0
  );
}

// The core Holistic Financial Plan summary math. Mirrors the "Summaries"
// sheet in the reference workbook exactly.
export function summarize(plan) {
  const income = totalByType(plan, "Income"); // positive
  const inescapable = totalByType(plan, "Inescapable Expense"); // negative
  const logjam = totalByType(plan, "Logjam Expense"); // negative
  const maintenance = totalByType(plan, "Maintenance Expense"); // negative
  const wealth = totalByType(plan, "Wealth Generating Expense"); // negative

  const returnToOverhead = inescapable + logjam + maintenance; // negative
  const remainingIncome = income + returnToOverhead;
  const profitPct = clampPct(plan.context.profitPct);
  const plannedProfit = profitPct * remainingIncome;
  const reinvestmentFund = remainingIncome - plannedProfit;
  const netIncome = wealth + reinvestmentFund;

  return {
    income,
    inescapable,
    logjam,
    maintenance,
    wealth,
    returnToOverhead,
    remainingIncome,
    profitPct,
    plannedProfit,
    reinvestmentFund,
    netIncome,
    // Return to Overhead as a fraction of income (the workbook's RTO %).
    rtoPctOfIncome: income ? (income + returnToOverhead) / income : 0,
  };
}

export function clampPct(p) {
  const n = Number(p);
  if (!isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

// Per-enterprise "Return to Overhead" (income minus that enterprise's direct
// expenses), as shown at the bottom of each enterprise sheet.
export function enterpriseSummary(ent) {
  const items = ent.items || [];
  let income = 0;
  let directExpense = 0;
  for (const it of items) {
    const ann = itemAnnual(it);
    if (it.type === "Income") income += ann;
    else directExpense += ann; // negative
  }
  const rto = income + directExpense;
  return {
    income,
    directExpense,
    returnToOverhead: rto,
    rtoPct: income ? rto / income : 0,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function fmtMoney(n, { cents = false } = {}) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

export function fmtPct(frac, digits = 0) {
  return `${(Number(frac || 0) * 100).toFixed(digits)}%`;
}

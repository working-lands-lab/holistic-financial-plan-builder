import { useState } from "react";
import {
  TYPE_LIST,
  TYPES,
  MONTHS,
  newItem,
  itemAnnual,
  monthlyArray,
  normalizeMonths,
  fmtMoney,
} from "@/lib/model";

// Current per-month magnitudes for an item (positive for income, positive
// magnitude for expenses), regardless of how it's stored.
function magnitudes(it) {
  const sign = TYPES[it.type]?.sign ?? -1;
  return monthlyArray(it).map((v) => sign * v || 0);
}

export default function LineItemsEditor({ items, onChange, allowedTypes }) {
  const types = allowedTypes || TYPE_LIST;
  const [open, setOpen] = useState({}); // item id -> show month grid

  const update = (id, patch) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id) => onChange(items.filter((it) => it.id !== id));
  const add = (type) => onChange([...items, newItem(type)]);
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const setMode = (it, mode) => {
    if (mode === "custom") {
      const months = it.mode === "custom" ? it.months : magnitudes(it);
      update(it.id, { mode, months: normalizeMonths(months) });
      setOpen((o) => ({ ...o, [it.id]: true }));
    } else {
      update(it.id, { mode, amount: Math.abs(itemAnnual(it)) });
    }
  };

  const setMonth = (it, idx, raw) => {
    const months = normalizeMonths(it.mode === "custom" ? it.months : magnitudes(it));
    months[idx] = Number(raw) || 0;
    const amount = months.reduce((a, b) => a + b, 0);
    update(it.id, { mode: "custom", months, amount });
  };

  const fillEvenly = (it) => {
    const total = it.mode === "custom" ? normalizeMonths(it.months).reduce((a, b) => a + b, 0) : it.amount;
    const per = (Number(total) || 0) / 12;
    update(it.id, { mode: "custom", months: new Array(12).fill(per), amount: per * 12 });
  };

  const clearMonths = (it) =>
    update(it.id, { mode: "custom", months: new Array(12).fill(0), amount: 0 });

  return (
    <div>
      {items.length === 0 ? (
        <div className="empty">
          No line items yet. Add income and expenses below.
        </div>
      ) : (
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: "20%" }}>Type</th>
              <th style={{ width: "22%" }}>Item</th>
              <th style={{ width: "22%" }}>Assumptions</th>
              <th style={{ width: "12%" }}>Amount</th>
              <th style={{ width: "16%" }}>Timing</th>
              <th style={{ width: "10%", textAlign: "right" }}>Annual</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const ann = itemAnnual(it);
              const custom = it.mode === "custom";
              const showGrid = open[it.id] || custom;
              const months = normalizeMonths(custom ? it.months : magnitudes(it));
              return (
                <FragmentRow key={it.id}>
                  <tr>
                    <td>
                      <select
                        value={it.type}
                        onChange={(e) => update(it.id, { type: e.target.value })}
                      >
                        {types.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={it.item}
                        placeholder="e.g. Yearling Sales"
                        onChange={(e) => update(it.id, { item: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={it.assumptions}
                        placeholder="e.g. 294 head at $2k each"
                        onChange={(e) =>
                          update(it.id, { assumptions: e.target.value })
                        }
                      />
                    </td>
                    <td className="num-cell">
                      {custom ? (
                        <span className="amount" title="Total of the monthly figures">
                          {fmtMoney(Math.abs(ann))}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.amount === 0 ? "" : it.amount}
                          placeholder="0"
                          onChange={(e) =>
                            update(it.id, {
                              amount: Math.abs(Number(e.target.value) || 0),
                            })
                          }
                        />
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <select
                          value={it.mode}
                          onChange={(e) => setMode(it, e.target.value)}
                          style={{ flex: 1 }}
                        >
                          <option value="even">Spread evenly</option>
                          <option value="single">One month</option>
                          <option value="custom">By month</option>
                        </select>
                        {it.mode === "single" && (
                          <select
                            value={it.month}
                            onChange={(e) =>
                              update(it.id, { month: Number(e.target.value) })
                            }
                            style={{ width: 70 }}
                          >
                            {MONTHS.map((m, i) => (
                              <option key={m} value={i}>
                                {m}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          className="btn ghost small"
                          onClick={() => toggle(it.id)}
                          title={showGrid ? "Hide months" : "Show months"}
                          aria-label="Toggle monthly breakdown"
                        >
                          {showGrid ? "▾" : "▸"}
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span
                        className={`amount ${ann >= 0 ? "pos" : "neg"}`}
                        title={it.type}
                      >
                        {fmtMoney(ann)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn danger small"
                        onClick={() => remove(it.id)}
                        title="Remove"
                        aria-label="Remove line item"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                  {showGrid && (
                    <tr className="month-grid-row">
                      <td colSpan={7}>
                        <div className="month-grid">
                          {MONTHS.map((m, i) => (
                            <label key={m} className="month-cell">
                              <span>{m}</span>
                              <input
                                type="number"
                                step="any"
                                value={months[i] === 0 ? "" : months[i]}
                                placeholder="0"
                                onChange={(e) => setMonth(it, i, e.target.value)}
                              />
                            </label>
                          ))}
                          <div className="month-grid-actions">
                            <button className="btn small" onClick={() => fillEvenly(it)}>
                              Fill evenly
                            </button>
                            <button className="btn ghost small" onClick={() => clearMonths(it)}>
                              Clear
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </FragmentRow>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="btn-row" style={{ marginTop: 14, flexWrap: "wrap" }}>
        {types.map((t) => (
          <button key={t} className="btn small" onClick={() => add(t)}>
            + {t}
          </button>
        ))}
      </div>
    </div>
  );
}

// A keyed wrapper so a row and its optional month grid share one React key.
function FragmentRow({ children }) {
  return <>{children}</>;
}

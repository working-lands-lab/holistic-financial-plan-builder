import {
  TYPE_LIST,
  TYPES,
  TYPE_HELP,
  MONTHS,
  newItem,
  itemAnnual,
  fmtMoney,
} from "@/lib/model";

export default function LineItemsEditor({ items, onChange, allowedTypes }) {
  const types = allowedTypes || TYPE_LIST;

  const update = (id, patch) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id) => onChange(items.filter((it) => it.id !== id));
  const add = (type) => onChange([...items, newItem(type)]);

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
              const pill = TYPES[it.type]?.pill || "";
              return (
                <tr key={it.id}>
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
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <select
                        value={it.mode}
                        onChange={(e) => update(it.id, { mode: e.target.value })}
                        style={{ flex: 1 }}
                      >
                        <option value="even">Spread evenly</option>
                        <option value="single">One month</option>
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

import { ISSUE_TYPES, ISSUE_TYPE_HELP, ISSUE_EXPENSE_GUIDE, uid } from "@/lib/model";

export default function IssuesEditor({ issues, enterprises, onChange, filterType }) {
  const shown = filterType
    ? issues.filter((i) => i.type === filterType)
    : issues;

  const update = (id, patch) =>
    onChange(issues.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id) => onChange(issues.filter((i) => i.id !== id));
  const add = () =>
    onChange([
      ...issues,
      {
        id: uid("iss"),
        type: filterType || "Adverse Factor",
        enterprise: "All",
        title: "",
        issue: "",
        rootCause: "",
        nextStep: "",
        costOfNothing: "",
        costOfResolving: "",
      },
    ]);

  const entOptions = ["All", ...enterprises.map((e) => e.name)];

  return (
    <div>
      {shown.length === 0 ? (
        <div className="empty">None recorded yet.</div>
      ) : (
        shown.map((it) => (
          <div className="enterprise-block" key={it.id}>
            <div className="enterprise-head">
              <input
                type="text"
                value={it.title}
                placeholder="Short title (e.g. Lack of Capital)"
                onChange={(e) => update(it.id, { title: e.target.value })}
                style={{ maxWidth: 320, fontWeight: 600 }}
              />
              <button className="btn danger small" onClick={() => remove(it.id)}>
                Remove
              </button>
            </div>
            <div className="enterprise-body">
              <div className="grid-3">
                {!filterType && (
                  <div className="field">
                    <label>Type</label>
                    <select
                      value={it.type}
                      onChange={(e) => update(it.id, { type: e.target.value })}
                    >
                      {ISSUE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Enterprise affected</label>
                  <select
                    value={it.enterprise}
                    onChange={(e) =>
                      update(it.id, { enterprise: e.target.value })
                    }
                  >
                    {entOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Issue description</label>
                  <textarea
                    value={it.issue}
                    onChange={(e) => update(it.id, { issue: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Root cause</label>
                  <textarea
                    value={it.rootCause}
                    onChange={(e) =>
                      update(it.id, { rootCause: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label>Next step to address it</label>
                <textarea
                  value={it.nextStep}
                  onChange={(e) => update(it.id, { nextStep: e.target.value })}
                />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Estimated cost of doing nothing</label>
                  <input
                    type="text"
                    value={it.costOfNothing}
                    placeholder="e.g. $14k/year in reduced forage"
                    onChange={(e) =>
                      update(it.id, { costOfNothing: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Estimated cost of resolving</label>
                  <input
                    type="text"
                    value={it.costOfResolving}
                    placeholder="e.g. $2k experiment"
                    onChange={(e) =>
                      update(it.id, { costOfResolving: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="note" style={{ margin: 0 }}>
                When funded, record this expense in: {ISSUE_EXPENSE_GUIDE[it.type]}
              </div>
            </div>
          </div>
        ))
      )}
      <button className="btn small" onClick={add} style={{ marginTop: 6 }}>
        + Add {filterType || "item"}
      </button>
    </div>
  );
}

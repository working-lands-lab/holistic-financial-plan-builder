import { useEffect, useMemo, useState } from "react";
import {
  TYPE_LIST,
  summarize,
  enterpriseSummary,
  fmtMoney,
  fmtPct,
  uid,
  clampPct,
} from "@/lib/model";
import { emptyPlan, examplePlan } from "@/lib/defaultPlan";
import LineItemsEditor from "./LineItemsEditor";
import IssuesEditor from "./IssuesEditor";

const STORAGE_KEY = "hfp-plan-v1";

const STEPS = [
  { key: "welcome", label: "Start" },
  { key: "enterprises", label: "Enterprises" },
  { key: "preliminary", label: "Hard Look" },
  { key: "plan", label: "Plan Enterprises" },
  { key: "general", label: "General & Misc" },
  { key: "profit", label: "Plan Profit" },
  { key: "balance", label: "Balance" },
  { key: "review", label: "Review & Export" },
];

export default function Planner() {
  const [plan, setPlan] = useState(null);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPlan(parsed.plan || emptyPlan());
        setStep(parsed.step || 0);
      } else {
        setPlan(emptyPlan());
      }
    } catch {
      setPlan(emptyPlan());
    }
    setLoaded(true);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!loaded || !plan) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan, step }));
    } catch {
      /* ignore quota errors */
    }
  }, [plan, step, loaded]);

  const summary = useMemo(() => (plan ? summarize(plan) : null), [plan]);

  if (!plan) return null;

  // ---- mutation helpers ----
  const setContext = (patch) =>
    setPlan({ ...plan, context: { ...plan.context, ...patch } });
  const setIssues = (issues) => setPlan({ ...plan, issues });
  const setGeneralItems = (items) =>
    setPlan({ ...plan, general: { ...plan.general, items } });
  const setEnterprise = (id, patch) =>
    setPlan({
      ...plan,
      enterprises: plan.enterprises.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    });
  const addEnterprise = () =>
    setPlan({
      ...plan,
      enterprises: [
        ...plan.enterprises,
        { id: uid("ent"), name: `Enterprise ${plan.enterprises.length + 1}`, items: [] },
      ],
    });
  const removeEnterprise = (id) =>
    setPlan({
      ...plan,
      enterprises: plan.enterprises.filter((e) => e.id !== id),
    });

  const go = (i) => setStep(Math.min(STEPS.length - 1, Math.max(0, i)));

  const resetAll = () => {
    if (confirm("Start over with a blank plan? This clears everything.")) {
      setPlan(emptyPlan());
      setStep(0);
    }
  };
  const loadExample = () => {
    if (confirm("Load the worked example? This replaces your current plan.")) {
      setPlan(examplePlan());
      setStep(0);
    }
  };

  const doExport = async () => {
    const name = (plan.context.businessName || "Holistic Financial Plan").replace(
      /[\\/:*?"<>|]/g,
      ""
    );
    // ExcelJS is heavy; load it (and the workbook builder) only on export so it
    // never blocks first paint.
    const { downloadWorkbook } = await import("@/lib/exportWorkbook");
    await downloadWorkbook(
      plan,
      `${name} ${plan.context.planningYear || ""}.xlsx`.trim()
    );
  };

  const stepKey = STEPS[step].key;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="leaf">❧</span>
            Holistic Financial Plan Builder
          </div>
          <div className="topbar-actions">
            <button className="btn ghost small" onClick={loadExample}>
              Load example
            </button>
            <button className="btn ghost small" onClick={resetAll}>
              Start over
            </button>
            <button className="btn primary small" onClick={doExport}>
              ↓ Export spreadsheet
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <nav className="stepper">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              className={i === step ? "active" : i < step ? "done" : ""}
              onClick={() => go(i)}
            >
              <span className="num">{i < step ? "✓" : i + 1}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {stepKey === "welcome" && (
          <WelcomeStep plan={plan} setContext={setContext} loadExample={loadExample} />
        )}
        {stepKey === "enterprises" && (
          <EnterprisesStep
            plan={plan}
            setEnterprise={setEnterprise}
            addEnterprise={addEnterprise}
            removeEnterprise={removeEnterprise}
          />
        )}
        {stepKey === "preliminary" && (
          <PreliminaryStep plan={plan} setIssues={setIssues} />
        )}
        {stepKey === "plan" && (
          <PlanEnterprisesStep plan={plan} setEnterprise={setEnterprise} />
        )}
        {stepKey === "general" && (
          <GeneralStep plan={plan} setGeneralItems={setGeneralItems} />
        )}
        {stepKey === "profit" && (
          <ProfitStep plan={plan} setContext={setContext} summary={summary} />
        )}
        {stepKey === "balance" && <BalanceStep plan={plan} summary={summary} />}
        {stepKey === "review" && (
          <ReviewStep plan={plan} summary={summary} doExport={doExport} />
        )}
      </main>

      <footer className="nav">
        <div className="nav-inner">
          <button
            className="btn"
            onClick={() => go(step - 1)}
            disabled={step === 0}
          >
            ← Back
          </button>
          <span className="progress-label">
            Step {step + 1} of {STEPS.length} · {STEPS[step].label}
          </span>
          {step < STEPS.length - 1 ? (
            <button className="btn primary" onClick={() => go(step + 1)}>
              Next →
            </button>
          ) : (
            <button className="btn primary" onClick={doExport}>
              ↓ Export spreadsheet
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ========================================================================= */
/* Steps                                                                     */
/* ========================================================================= */

function WelcomeStep({ plan, setContext, loadExample }) {
  return (
    <div className="card">
      <div className="step-eyebrow">Holistic Financial Planning</div>
      <h1 className="step-title">Put figures to your dreams.</h1>
      <p className="lead">
        This tool walks you through the Holistic Financial Planning process
        taught by the Savory Institute. Instead of letting expenses rise to meet
        anticipated income, you'll take a hard look at what's holding you back,
        plan each enterprise, set aside profit <em>first</em>, and bring the
        plan into balance. At the end you can export a complete take-home
        spreadsheet.
      </p>

      <div className="note">
        <strong>The big idea:</strong> Calculate your total gross income, then
        set aside up to 50% as profit. The remainder is all you have to allocate
        for the expenses you're about to plan. This discipline keeps spending
        below what you're actually likely to make.
      </div>

      <hr className="divider" />

      <div className="grid-2">
        <div className="field">
          <label>Business / hub name</label>
          <input
            type="text"
            value={plan.context.businessName}
            placeholder="e.g. Smith Family Ranch"
            onChange={(e) => setContext({ businessName: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Planning year</label>
          <input
            type="number"
            value={plan.context.planningYear}
            onChange={(e) =>
              setContext({ planningYear: Number(e.target.value) || "" })
            }
          />
        </div>
      </div>

      <div className="field">
        <label>Holistic context / quality-of-life statement (optional)</label>
        <textarea
          value={plan.context.qualityOfLife}
          placeholder="What you and your family value most deeply — the goals this plan should move you toward."
          onChange={(e) => setContext({ qualityOfLife: e.target.value })}
        />
        <div className="hint">
          Keep this in mind throughout: check that the actions and tools behind
          every expense are aligned with it.
        </div>
      </div>

      <div className="note" style={{ marginBottom: 0 }}>
        New here? <button className="btn small" onClick={loadExample}>
          Load the worked example
        </button>{" "}
        to see a finished plan built from fabricated sample figures, then start
        over when ready. Your work saves automatically in this browser.
      </div>
    </div>
  );
}

function EnterprisesStep({ plan, setEnterprise, addEnterprise, removeEnterprise }) {
  return (
    <div className="card">
      <div className="step-eyebrow">Step 1 · Lay the foundation</div>
      <h1 className="step-title">Name your enterprises.</h1>
      <p className="lead">
        An <strong>enterprise</strong> is a distinct income-generating activity —
        yearlings, grazing leases, a class, a value-added product. List each one
        separately so you can see which truly contributes to covering your fixed
        costs. You'll plan the numbers for each in a later step.
      </p>

      <div className="quote">
        "It is the gross profits of all enterprises combined that must cover all
        the fixed costs of the business and provide the excess that becomes your
        profit." Be prepared to drop any enterprise that isn't pulling its
        weight — and diversify so you're not relying on a single one.
      </div>

      <div style={{ marginTop: 18 }}>
        {plan.enterprises.map((e) => (
          <div className="row-between" key={e.id} style={{ marginBottom: 10 }}>
            <input
              type="text"
              value={e.name}
              onChange={(ev) => setEnterprise(e.id, { name: ev.target.value })}
              style={{ maxWidth: 420 }}
            />
            <button
              className="btn danger small"
              onClick={() => removeEnterprise(e.id)}
              disabled={plan.enterprises.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button className="btn small" onClick={addEnterprise}>
          + Add enterprise
        </button>
      </div>
    </div>
  );
}

function PreliminaryStep({ plan, setIssues }) {
  const sections = [
    {
      type: "Logjam",
      title: "Is there a logjam?",
      body: "A logjam is the one thing blocking all genuine progress toward your goals — often tied to people, mindset, or how the business was set up. Clearing it gets the highest priority, and if it takes money, that money is allocated before anything else.",
    },
    {
      type: "Adverse Factor",
      title: "What else is adversely affecting the business?",
      body: "Things that reduce overall efficiency and productivity — less urgent than a logjam, but if ignored they can become one. Lack of capital, no marketing, poor communications, no time for family.",
    },
    {
      type: "Weak Link",
      title: "What is the weak link in each enterprise?",
      body: "The weakest point in an enterprise's chain of production — resource (energy) conversion, product conversion, or marketing (money). Addressing it strengthens the whole business, so these expenses get priority.",
    },
    {
      type: "Control Plan",
      title: "Control plans (optional)",
      body: "Planned actions to keep something on track once you've addressed it.",
    },
  ];

  return (
    <div className="card">
      <div className="step-eyebrow">Step 2 · Take a hard look</div>
      <h1 className="step-title">Preliminary planning.</h1>
      <p className="lead">
        Before putting numbers on paper, step back and identify what's blocking
        or weakening the business. List what you find here. These notes don't
        flow automatically into the financial figures — when you decide to fund
        a fix, you'll add it as a line item in the right place (the app reminds
        you where).
      </p>

      {sections.map((s) => (
        <div key={s.type} style={{ marginTop: 22 }}>
          <h3 style={{ marginBottom: 4 }}>{s.title}</h3>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 10 }}>
            {s.body}
          </p>
          <IssuesEditor
            issues={plan.issues}
            enterprises={plan.enterprises}
            onChange={setIssues}
            filterType={s.type}
          />
        </div>
      ))}
    </div>
  );
}

function PlanEnterprisesStep({ plan, setEnterprise }) {
  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="step-eyebrow">Steps 3–5 · Put the plan on paper</div>
        <h1 className="step-title">Plan each enterprise.</h1>
        <p className="lead">
          For every enterprise, enter the income and the expenses you expect,
          and when they occur. As you go, categorize each expense — this drives
          the whole summary:
        </p>
        <ul className="clean">
          <li>
            <strong>Income</strong> — money coming in (enter as a positive
            amount).
          </li>
          <li>
            <strong>Wealth Generating</strong> — spending that grows income soon
            (weak links, adverse factors, marketing). Given priority.
          </li>
          <li>
            <strong>Inescapable</strong> — legally/morally obligated, fixed,
            non-negotiable.
          </li>
          <li>
            <strong>Maintenance</strong> — keeps the business running at current
            income. Most expenses live here.
          </li>
          <li>
            <strong>Logjam</strong> — spending to clear a logjam (usually
            recorded on the General sheet).
          </li>
        </ul>
        <div className="note" style={{ marginBottom: 0 }}>
          Enter every amount as a positive number — the app applies the correct
          sign automatically (income +, expenses −).
        </div>
      </div>

      {plan.enterprises.map((ent) => {
        const es = enterpriseSummary(ent);
        return (
          <div className="card" key={ent.id} style={{ marginBottom: 18 }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <h2 style={{ margin: 0 }}>{ent.name}</h2>
              <div className="muted" style={{ fontSize: 13 }}>
                Return to Overhead:{" "}
                <span
                  className={`amount ${
                    es.returnToOverhead >= 0 ? "pos" : "neg"
                  }`}
                >
                  {fmtMoney(es.returnToOverhead)}
                </span>{" "}
                {es.income ? `(${fmtPct(es.rtoPct, 1)} of income)` : ""}
              </div>
            </div>
            <LineItemsEditor
              items={ent.items}
              onChange={(items) => setEnterprise(ent.id, { items })}
            />
          </div>
        );
      })}
    </div>
  );
}

function GeneralStep({ plan, setGeneralItems }) {
  return (
    <div className="card">
      <div className="step-eyebrow">Steps 2 & 4 · Other income and expenses</div>
      <h1 className="step-title">General & miscellaneous.</h1>
      <p className="lead">
        Record income and costs that aren't tied to a single enterprise — fixed
        costs like utilities, insurance, a shared vehicle, land tax, plus
        miscellaneous income. This is also where logjam and adverse-factor
        spending goes (logjam fixes as a <strong>Logjam Expense</strong>,
        adverse-factor fixes as a <strong>Wealth Generating Expense</strong>).
      </p>
      <div className="note">
        Consider a <strong>depreciation contribution</strong> here too, so that
        when an asset wears out you can replace it without borrowing — or move
        that money to a wealth-generating expense to grow the business instead.
      </div>
      <LineItemsEditor items={plan.general.items} onChange={setGeneralItems} />
    </div>
  );
}

function ProfitStep({ plan, setContext, summary }) {
  const pct = clampPct(plan.context.profitPct);
  return (
    <div className="card">
      <div className="step-eyebrow">Step 6 · Plan the profit</div>
      <h1 className="step-title">Set aside profit first.</h1>
      <p className="lead">
        Your purpose here is to place a ceiling on how high your expenses can
        rise. Reduce remaining income by up to 50% and treat that as
        non-negotiable profit. The rest is all you have to fund maintenance and
        wealth-generating expenses.
      </p>

      <div className="slider-wrap">
        <div className="profit-readout">
          <span className="big">{Math.round(pct * 100)}%</span>
          <span className="muted">of remaining income set aside as profit</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={Math.round(pct * 100)}
          onChange={(e) =>
            setContext({ profitPct: Number(e.target.value) / 100 })
          }
        />
        <div className="row-between faint" style={{ fontSize: 12 }}>
          <span>0%</span>
          <span>50% (Savory default)</span>
          <span>100%</span>
        </div>
      </div>

      <div className="note warn">
        Allocate too small a percentage and you'll expend too little effort for
        the returns you seek. 50% sounds steep, but many ranchers hit it. If
        you're carrying heavy debt, subtract debt payments first, then set
        profit on what remains.
      </div>

      {summary && (
        <div className="summary-grid">
          <Metric k="Remaining income" v={summary.remainingIncome} />
          <Metric
            k={`Planned profit (${Math.round(pct * 100)}%)`}
            v={summary.plannedProfit}
            good
          />
          <Metric k="Reinvestment fund" v={summary.reinvestmentFund} />
        </div>
      )}
      <p className="muted" style={{ fontSize: 13 }}>
        The reinvestment fund is what's left after profit — your budget for
        wealth-generating expenses. If wealth-generating spending exceeds it,
        net income goes negative and you'll need to rebalance in the next step.
      </p>
    </div>
  );
}

function BalanceStep({ plan, summary }) {
  const s = summary;
  const balanced = s.netIncome >= 0;
  const remainingPositive = s.remainingIncome >= 0;
  return (
    <div className="card">
      <div className="step-eyebrow">Steps 7–10 & 14 · Bring it into balance</div>
      <h1 className="step-title">Assess the plan.</h1>
      <p className="lead">
        Here's the whole plan on one page — the same math as the workbook's
        Summaries sheet. Adjust expenses (go back and trim maintenance, or move
        dollars to the highest-return wealth-generating expenses) until the plan
        balances.
      </p>

      <div className="summary-grid">
        <Metric k="Gross income" v={s.income} />
        <Metric k="Return to overhead" v={s.returnToOverhead} />
        <Metric
          k="Remaining income"
          v={s.remainingIncome}
          good={remainingPositive}
          bad={!remainingPositive}
        />
        <Metric k="Planned profit" v={s.plannedProfit} />
        <Metric k="Reinvestment fund" v={s.reinvestmentFund} />
        <Metric
          k="Net income"
          v={s.netIncome}
          good={balanced}
          bad={!balanced}
        />
      </div>

      <table className="statement">
        <tbody>
          <Line label="Income" comment="Gross income" v={s.income} />
          <Line label="Inescapable expense" v={s.inescapable} sub />
          <Line label="Logjam expense" v={s.logjam} sub />
          <Line label="Maintenance expense" v={s.maintenance} sub />
          <Line
            label="Return to overhead"
            v={s.returnToOverhead}
            comment="Income taken to cover inescapable, logjam & maintenance"
            total
          />
          <Line
            label="Remaining income"
            v={s.remainingIncome}
            comment="Must be positive"
            total
          />
          <Line
            label={`Planned profit (${Math.round(s.profitPct * 100)}%)`}
            v={-s.plannedProfit}
            comment="Non-negotiable; taken off the top"
          />
          <Line
            label="Reinvestment fund"
            v={s.reinvestmentFund}
            comment="Budget for wealth-generating expenses"
            total
          />
          <Line
            label="Wealth generating expenses"
            v={s.wealth}
            sub
          />
          <Line
            label="Net income"
            v={s.netIncome}
            comment="Excess (or shortfall) under this plan"
            total
          />
        </tbody>
      </table>

      <div className={`note ${balanced ? "" : "warn"}`} style={{ marginBottom: 0 }}>
        {!remainingPositive ? (
          <>
            <strong>Remaining income is negative.</strong> Your overheads exceed
            your income. You must cut maintenance/inescapable costs or raise
            income before going further.
          </>
        ) : balanced ? (
          <>
            <strong>The plan balances.</strong> Income covers all expenses and
            your planned profit. Now decide where to invest the profit and
            check your month-to-month cash flow.
          </>
        ) : (
          <>
            <strong>Net income is negative.</strong> Your wealth-generating
            spending exceeds the reinvestment fund. Either trim the
            lowest-return wealth-generating expenses, cut maintenance to free up
            cash, or intentionally lower your profit % to invest in growth — but
            do it on purpose.
          </>
        )}
      </div>
    </div>
  );
}

function ReviewStep({ plan, summary, doExport }) {
  const s = summary;
  const itemCount =
    plan.general.items.filter((i) => i.item || i.amount).length +
    plan.enterprises.reduce(
      (a, e) => a + e.items.filter((i) => i.item || i.amount).length,
      0
    );
  return (
    <div className="card">
      <div className="step-eyebrow">Take it home</div>
      <h1 className="step-title">Review & export.</h1>
      <p className="lead">
        Your plan is ready. Export it as an Excel workbook structured just like
        the reference plan — with a Summaries sheet, a sheet per enterprise, a
        General sheet, your preliminary-planning notes, an All Items Table, and
        a blank enterprise template. The summary figures are live formulas, so
        you can keep adjusting in Excel.
      </p>

      <div className="summary-grid">
        <Metric k="Enterprises" v={plan.enterprises.length} money={false} />
        <Metric k="Line items" v={itemCount} money={false} />
        <Metric k="Gross income" v={s.income} />
        <Metric
          k="Net income"
          v={s.netIncome}
          good={s.netIncome >= 0}
          bad={s.netIncome < 0}
        />
      </div>

      <div className="row-between" style={{ marginTop: 8 }}>
        <div>
          <h3 style={{ marginBottom: 2 }}>
            {plan.context.businessName || "Your plan"} ·{" "}
            {plan.context.planningYear}
          </h3>
          <div className="muted" style={{ fontSize: 13 }}>
            Exports as an .xlsx workbook you can open in Excel, Numbers, or
            Google Sheets.
          </div>
        </div>
        <button className="btn primary" onClick={doExport}>
          ↓ Export spreadsheet
        </button>
      </div>

      <hr className="divider" />
      <h3>What comes next (in your spreadsheet)</h3>
      <ul className="clean">
        <li>
          <strong>Check the cash flow</strong> month by month — even a positive
          bottom line can hide a month where you run short. Add a monthly
          surplus/deficit and running bank balance.
        </li>
        <li>
          <strong>Factor in debt</strong> against that cash flow if you carry
          any.
        </li>
        <li>
          <strong>Monitor through the year</strong> — fill in the "Actual"
          columns each month and compare to plan so you can act early and
          protect your profit.
        </li>
      </ul>
    </div>
  );
}

/* ========================================================================= */
/* Small presentational helpers                                              */
/* ========================================================================= */

function Metric({ k, v, good, bad, money = true }) {
  const cls = good ? "good" : bad ? "bad" : "";
  const vcls = typeof v === "number" && money ? (v >= 0 ? "pos" : "neg") : "";
  return (
    <div className={`metric ${cls}`}>
      <div className="k">{k}</div>
      <div className={`v ${vcls}`}>{money ? fmtMoney(v) : v}</div>
    </div>
  );
}

function Line({ label, v, comment, total, sub }) {
  return (
    <tr className={total ? "total" : sub ? "sub" : ""}>
      <td>
        {label}
        {comment ? <span className="comment"> — {comment}</span> : null}
      </td>
      <td className={`amt ${v >= 0 ? "pos" : "neg"}`}>{fmtMoney(v)}</td>
    </tr>
  );
}

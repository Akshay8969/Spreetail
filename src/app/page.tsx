"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Balance {
  name: string;
  avatarColor: string;
  net: number;
}

interface ExpenseSummary {
  id: string;
  description: string;
  date: string;
  amountInr: number;
  currencyOriginal: string;
  amountOriginal: number;
  paidBy: { name: string; avatarColor: string };
  splits: { person: { name: string }; shareAmountInr: number }[];
  splitType: string;
  isFlagged: boolean;
}

interface Settlement {
  id: string;
  date: string;
  amountInr: number;
  paidBy: { name: string; avatarColor: string };
  paidTo: { name: string; avatarColor: string };
}

const PERSON_COLORS: Record<string, string> = {
  Aisha: "#8b5cf6",
  Rohan: "#06b6d4",
  Priya: "#f59e0b",
  Meera: "#10b981",
  Dev: "#f43f5e",
  Sam: "#6366f1",
};

function Avatar({ name, color }: { name: string; color?: string }) {
  return (
    <span
      className="avatar"
      style={{ background: color || PERSON_COLORS[name] || "#94a3b8" }}
    >
      {name[0]}
    </span>
  );
}

function formatCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function SplitBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    EQUAL: "badge-blue",
    UNEQUAL: "badge-purple",
    PERCENTAGE: "badge-yellow",
    SHARE: "badge-orange",
  };
  return <span className={`badge ${map[type] || "badge-gray"}`}>{type}</span>;
}

export default function HomePage() {
  const [data, setData] = useState<{
    expenses: ExpenseSummary[];
    settlements: Settlement[];
    balances: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"balances" | "expenses" | "settlements">("balances");
  const [showImported, setShowImported] = useState(false);

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const totalExpenses = data?.expenses?.reduce((s, e) => s + e.amountInr, 0) ?? 0;
  const balanceEntries = Object.entries(data?.balances ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Nav */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <span className="nav-logo-icon">💸</span>
          FlatSplit
        </a>
        <a href="/" className={`nav-link ${activeTab === "balances" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveTab("balances"); }}>Balances</a>
        <a href="/" className={`nav-link ${activeTab === "expenses" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveTab("expenses"); }}>Expenses</a>
        <a href="/" className={`nav-link ${activeTab === "settlements" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveTab("settlements"); }}>Settlements</a>
        <Link href="/import" className="nav-link">Import CSV</Link>
        <Link href="/add-expense" className="btn btn-primary" style={{ padding: "7px 16px", fontSize: 13 }}>+ Add Expense</Link>
      </nav>

      <div className="page">
        {/* Hero */}
        <div className="hero">
          <div className="hero-title">The Flat — Shared Expenses</div>
          <div className="hero-sub">
            Aisha · Rohan · Priya · Meera (until Mar) · Sam (from Apr) · Dev (guest)
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4 mb-6">
          <div className="stat-card">
            <div className="stat-label">Total Expenses</div>
            <div className="stat-value">{formatCurrency(totalExpenses)}</div>
            <div className="stat-sub">{data?.expenses?.length ?? 0} entries</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Members</div>
            <div className="stat-value">{balanceEntries.length}</div>
            <div className="stat-sub">people tracked</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Settlements</div>
            <div className="stat-value">{data?.settlements?.length ?? 0}</div>
            <div className="stat-sub">payments recorded</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Flagged</div>
            <div className="stat-value" style={{ color: "var(--yellow)" }}>
              {data?.expenses?.filter((e) => e.isFlagged).length ?? 0}
            </div>
            <div className="stat-sub">need review</div>
          </div>
        </div>

        {loading && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <div className="text-muted">Loading expenses…</div>
          </div>
        )}

        {error && (
          <div className="card" style={{ borderColor: "var(--red)", padding: 24 }}>
            <span style={{ color: "var(--red)" }}>⚠ {error}</span>
            <span className="text-muted" style={{ marginLeft: 12 }}>
              Have you set up your database and run the import yet?{" "}
              <Link href="/import" style={{ color: "var(--accent)" }}>Go to Import →</Link>
            </span>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── BALANCES TAB ── */}
            {activeTab === "balances" && (
              <section>
                <div className="section-title">Net Balances</div>
                <div className="section-sub">Positive = owed money back. Negative = owes others.</div>
                {balanceEntries.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                    No data yet.{" "}
                    <Link href="/import" style={{ color: "var(--accent)" }}>Import the CSV to get started →</Link>
                  </div>
                ) : (
                  <div className="grid-3">
                    {balanceEntries.map(([name, net]) => (
                      <div key={name} className="balance-card">
                        <div className="balance-name">
                          <Avatar name={name} />
                          {name}
                        </div>
                        <div className={`balance-amount ${net > 0.5 ? "balance-positive" : net < -0.5 ? "balance-negative" : "balance-neutral"}`}>
                          {net > 0 ? "+" : ""}{formatCurrency(net)}
                        </div>
                        <div className="stat-sub">
                          {Math.abs(net) < 0.5
                            ? "✓ Settled up"
                            : net > 0
                            ? `Others owe ${name}`
                            : `${name} owes others`}
                        </div>
                        <Link href={`/balance/${encodeURIComponent(name)}`} className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}>
                          See breakdown →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* Settlement suggestions */}
                {balanceEntries.length > 0 && (
                  <div className="mt-8">
                    <div className="section-title">How to Settle Up</div>
                    <SettlementSuggestions balances={data!.balances} />
                  </div>
                )}
              </section>
            )}

            {/* ── EXPENSES TAB ── */}
            {activeTab === "expenses" && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="section-title" style={{ marginBottom: 0 }}>All Expenses</div>
                  <label className="flex items-center gap-2 text-muted" style={{ cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={showImported} onChange={(e) => setShowImported(e.target.checked)} />
                    Show flagged only
                  </label>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Paid By</th>
                        <th>Amount</th>
                        <th>Split</th>
                        <th>Split With</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.expenses ?? [])
                        .filter((e) => !showImported || e.isFlagged)
                        .map((exp) => (
                          <tr key={exp.id} style={exp.isFlagged ? { background: "rgba(245,158,11,0.04)" } : {}}>
                            <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: 12 }}>
                              {new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </td>
                            <td>
                              <div style={{ fontWeight: 500, color: "var(--text)" }}>{exp.description}</div>
                              {exp.isFlagged && <span className="badge badge-yellow" style={{ marginTop: 4 }}>⚠ flagged</span>}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <Avatar name={exp.paidBy.name} color={exp.paidBy.avatarColor} />
                                {exp.paidBy.name}
                              </div>
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {formatCurrency(exp.amountInr)}
                              {exp.currencyOriginal !== "INR" && (
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  ({exp.currencyOriginal} {exp.amountOriginal})
                                </div>
                              )}
                            </td>
                            <td><SplitBadge type={exp.splitType} /></td>
                            <td>
                              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                                {exp.splits.map((s) => (
                                  <span key={s.person.name} className="badge badge-gray">
                                    {s.person.name} {formatCurrency(s.shareAmountInr)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <Link href={`/expense/${exp.id}`} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                                Detail
                              </Link>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── SETTLEMENTS TAB ── */}
            {activeTab === "settlements" && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="section-title" style={{ marginBottom: 0 }}>Settlements & Payments</div>
                  <Link href="/settle" className="btn btn-primary" style={{ padding: "7px 16px", fontSize: 13 }}>+ Record Payment</Link>
                </div>
                {(data?.settlements ?? []).length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No settlements recorded yet.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data!.settlements.map((s) => (
                          <tr key={s.id}>
                            <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <Avatar name={s.paidBy.name} color={s.paidBy.avatarColor} />
                                {s.paidBy.name}
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <Avatar name={s.paidTo.name} color={s.paidTo.avatarColor} />
                                {s.paidTo.name}
                              </div>
                            </td>
                            <td style={{ fontWeight: 600, color: "var(--green)" }}>
                              {formatCurrency(s.amountInr)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Settlement Suggestions (simplified debt-reduction) ─────────────────────
function SettlementSuggestions({ balances }: { balances: Record<string, number> }) {
  const transactions: { from: string; to: string; amount: number }[] = [];
  const pos = Object.entries(balances).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
  const neg = Object.entries(balances).filter(([, v]) => v < -0.5).sort((a, b) => a[1] - b[1]);

  const posArr = pos.map(([n, v]) => ({ name: n, amt: v }));
  const negArr = neg.map(([n, v]) => ({ name: n, amt: -v }));

  let i = 0, j = 0;
  while (i < posArr.length && j < negArr.length) {
    const pay = Math.min(posArr[i].amt, negArr[j].amt);
    transactions.push({ from: negArr[j].name, to: posArr[i].name, amount: Math.round(pay) });
    posArr[i].amt -= pay;
    negArr[j].amt -= pay;
    if (posArr[i].amt < 0.5) i++;
    if (negArr[j].amt < 0.5) j++;
  }

  if (transactions.length === 0) {
    return <div className="card" style={{ color: "var(--green)" }}>✓ Everyone is settled up!</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {transactions.map((t, idx) => (
        <div key={idx} className="card flex items-center justify-between" style={{ padding: "14px 20px" }}>
          <div className="flex items-center gap-3">
            <Avatar name={t.from} />
            <span style={{ fontWeight: 500 }}>{t.from}</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <Avatar name={t.to} />
            <span style={{ fontWeight: 500 }}>{t.to}</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>
            ₹{t.amount.toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}

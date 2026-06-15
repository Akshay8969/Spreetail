"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Expense {
  id: string;
  description: string;
  date: string;
  amountInr: number;
  currencyOriginal: string;
  amountOriginal: number;
  splitType: string;
  notes: string | null;
  paidBy: { name: string; avatarColor: string };
  splits: { person: { name: string; avatarColor: string }; shareAmountInr: number; settledAt: string | null }[];
  anomalies: { anomalyType: string; anomalyDescription: string; actionTaken: string; resolutionNotes: string }[];
  isFlagged?: boolean;
}

function Avatar({ name, color }: { name: string; color?: string }) {
  const COLORS: Record<string, string> = { Aisha: "#8b5cf6", Rohan: "#06b6d4", Priya: "#f59e0b", Meera: "#10b981", Dev: "#f43f5e", Sam: "#6366f1" };
  return (
    <span className="avatar" style={{ background: color || COLORS[name] || "#94a3b8" }}>
      {name[0]}
    </span>
  );
}

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/expenses/${id}`)
      .then((r) => r.json())
      .then(setExpense)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh" }}>
      
      <div className="page"><div className="card" style={{ textAlign: "center", padding: 48 }}><div className="spinner" style={{ margin: "0 auto" }} /></div></div>
    </div>
  );

  if (!expense) return (
    <div style={{ minHeight: "100vh" }}>
      <nav className="nav"><Link href="/" className="nav-logo"><span className="nav-logo-icon">💸</span>FlatSplit</Link></nav>
      <div className="page"><div className="card" style={{ color: "var(--red)" }}>Expense not found.</div></div>
    </div>
  );

  const totalSplitAmount = expense.splits.reduce((s, sp) => s + sp.shareAmountInr, 0);
  const diff = Math.abs(expense.amountInr - totalSplitAmount);

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav className="nav">
        <Link href="/" className="nav-logo"><span className="nav-logo-icon">💸</span>FlatSplit</Link>
        <Link href="/" className="nav-link">← All Expenses</Link>
      </nav>
      <div className="page">
        <div className="hero" style={{ marginBottom: 24 }}>
          <div className="hero-title">{expense.description}</div>
          <div className="hero-sub">
            {new Date(expense.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {expense.notes && <span> · {expense.notes}</span>}
          </div>
        </div>

        <div className="grid-2 mb-6">
          {/* Main info */}
          <div className="card">
            <div className="section-title">Expense Details</div>
            <table style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--text-muted)", width: 140 }}>Paid by</td>
                  <td><div className="flex items-center gap-2"><Avatar name={expense.paidBy.name} color={expense.paidBy.avatarColor} />{expense.paidBy.name}</div></td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>Total amount</td>
                  <td style={{ fontWeight: 700, fontSize: 18 }}>₹{expense.amountInr.toLocaleString("en-IN")}</td>
                </tr>
                {expense.currencyOriginal !== "INR" && (
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>Original</td>
                    <td>{expense.currencyOriginal} {expense.amountOriginal} <span className="badge badge-purple">converted at 1 USD = ₹84</span></td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>Split type</td>
                  <td><span className={`badge badge-${expense.splitType === "EQUAL" ? "blue" : expense.splitType === "PERCENTAGE" ? "yellow" : expense.splitType === "SHARE" ? "orange" : "purple"}`}>{expense.splitType}</span></td>
                </tr>
                {expense.anomalies?.length > 0 && (
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>Anomalies</td>
                    <td><span className="badge badge-yellow">⚠ {expense.anomalies.length} flag{expense.anomalies.length > 1 ? "s" : ""}</span></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Split breakdown */}
          <div className="card">
            <div className="section-title">Who Owes What</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {expense.splits.map((sp) => {
                const pct = expense.amountInr > 0 ? ((sp.shareAmountInr / expense.amountInr) * 100).toFixed(1) : "0";
                const isPayer = sp.person.name === expense.paidBy.name;
                return (
                  <div key={sp.person.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={sp.person.name} color={sp.person.avatarColor} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{sp.person.name} {isPayer && <span className="badge badge-green" style={{ fontSize: 10 }}>paid</span>}</div>
                      <div style={{ height: 4, background: "var(--border)", borderRadius: 99, marginTop: 6 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 99 }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>₹{sp.shareAmountInr.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{pct}%</div>
                    </div>
                    {sp.settledAt && <span className="badge badge-green">✓</span>}
                  </div>
                );
              })}

              {diff > 1 && (
                <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, fontSize: 12, color: "var(--yellow)" }}>
                  ⚠ Split sum (₹{totalSplitAmount.toFixed(2)}) differs from total (₹{expense.amountInr.toFixed(2)}) by ₹{diff.toFixed(2)}. Rounding artifact.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Anomalies */}
        {expense.anomalies?.length > 0 && (
          <div className="card">
            <div className="section-title">Import Anomalies for This Row</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {expense.anomalies.map((a, i) => (
                <div key={i} style={{ padding: "12px 16px", background: "var(--bg-card2)", borderRadius: 8, display: "flex", gap: 12 }}>
                  <span className={`badge ${a.actionTaken === "SKIPPED" ? "badge-red" : a.actionTaken === "FLAGGED" ? "badge-yellow" : "badge-green"}`} style={{ flexShrink: 0 }}>
                    {a.actionTaken}
                  </span>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>{a.anomalyType.replace(/_/g, " ")}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{a.anomalyDescription}</div>
                    <div style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 4 }}>Resolution: {a.resolutionNotes}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

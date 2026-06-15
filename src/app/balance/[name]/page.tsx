"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface BalanceDetail {
  name: string;
  avatarColor: string;
  netBalance: number;
  totalPaid: number;
  totalOwed: number;
  expenseBreakdown: {
    expenseId: string;
    description: string;
    date: string;
    paidBy: string;
    amountInr: number;
    yourShare: number;
    youPaid: boolean;
  }[];
  settlements: {
    date: string;
    direction: "paid" | "received";
    otherPerson: string;
    amount: number;
  }[];
}

function Avatar({ name, color }: { name: string; color?: string }) {
  const COLORS: Record<string, string> = { Aisha: "#8b5cf6", Rohan: "#06b6d4", Priya: "#f59e0b", Meera: "#10b981", Dev: "#f43f5e", Sam: "#6366f1" };
  return (
    <span className="avatar" style={{ background: color || COLORS[name] || "#94a3b8", width: 36, height: 36, fontSize: 15 }}>
      {name[0]}
    </span>
  );
}

export default function BalancePage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name);
  const [data, setData] = useState<BalanceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/balance/${encodeURIComponent(decodedName)}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [decodedName]);

  if (loading) return (
    <div style={{ minHeight: "100vh" }}>
      
      <div className="page"><div className="card" style={{ textAlign: "center", padding: 48 }}><div className="spinner" style={{ margin: "0 auto" }} /></div></div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: "100vh" }}>
      <nav className="nav"><Link href="/" className="nav-logo"><span className="nav-logo-icon">💸</span>FlatSplit</Link></nav>
      <div className="page"><div className="card" style={{ color: "var(--red)" }}>Person not found.</div></div>
    </div>
  );

  const net = data.netBalance;

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav className="nav">
        <Link href="/" className="nav-logo"><span className="nav-logo-icon">💸</span>FlatSplit</Link>
        <Link href="/" className="nav-link">← Back</Link>
      </nav>
      <div className="page">
        {/* Hero */}
        <div className="hero mb-6">
          <div className="flex items-center gap-4" style={{ marginBottom: 12 }}>
            <Avatar name={decodedName} color={data.avatarColor} />
            <div>
              <div className="hero-title">{decodedName}&apos;s Balance</div>
              <div className="hero-sub">Full calculation trace — every expense explained</div>
            </div>
          </div>
          <div className={`balance-amount ${net > 0.5 ? "balance-positive" : net < -0.5 ? "balance-negative" : "balance-neutral"}`} style={{ fontSize: 36 }}>
            {net > 0 ? "+" : ""}₹{Math.abs(net).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {Math.abs(net) < 0.5 ? "✓ Settled up" : net > 0 ? `Others owe ${decodedName} this amount` : `${decodedName} owes this amount to others`}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid-3 mb-6">
          <div className="stat-card">
            <div className="stat-label">Total Paid Out</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>₹{data.totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="stat-sub">expenses {decodedName} paid for</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Owed (Share)</div>
            <div className="stat-value" style={{ color: "var(--red)" }}>₹{data.totalOwed.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="stat-sub">{decodedName}&apos;s share of all expenses</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Net Balance</div>
            <div className={`stat-value ${net > 0 ? "balance-positive" : net < 0 ? "balance-negative" : "balance-neutral"}`}>
              {net >= 0 ? "+" : ""}₹{Math.abs(net).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div className="stat-sub">= Paid − Owed</div>
          </div>
        </div>

        {/* Formula */}
        <div className="card mb-6" style={{ background: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.2)" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Balance Calculation Formula</div>
          <div style={{ fontFamily: "monospace", fontSize: 14 }}>
            Net = Total Paid (₹{data.totalPaid.toFixed(2)}) − Total Share Owed (₹{data.totalOwed.toFixed(2)}) = <strong style={{ color: net >= 0 ? "var(--green)" : "var(--red)" }}>₹{net.toFixed(2)}</strong>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="section-title">Expense-by-Expense Breakdown</div>
        <div className="section-sub">Every expense {decodedName} is involved in, with their exact share</div>
        <div className="table-wrap mb-6">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Paid By</th>
                <th>Total</th>
                <th>{decodedName}&apos;s Share</th>
                <th>Effect on Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.expenseBreakdown.map((row) => (
                <tr key={row.expenseId}>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    <Link href={`/expense/${row.expenseId}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                      {row.description}
                    </Link>
                  </td>
                  <td>{row.paidBy}</td>
                  <td>₹{row.amountInr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td style={{ fontWeight: 600 }}>₹{row.yourShare.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td>
                    {row.youPaid ? (
                      <span style={{ color: "var(--green)" }}>
                        +₹{(row.amountInr - row.yourShare).toLocaleString("en-IN", { maximumFractionDigits: 0 })} (paid, owed back)
                      </span>
                    ) : (
                      <span style={{ color: "var(--red)" }}>
                        −₹{row.yourShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })} (owes)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Settlements */}
        {data.settlements.length > 0 && (
          <>
            <div className="section-title">Settlement History</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Direction</th><th>Other Person</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {data.settlements.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                      <td>
                        <span className={`badge ${s.direction === "paid" ? "badge-red" : "badge-green"}`}>
                          {s.direction === "paid" ? `Paid to ${s.otherPerson}` : `Received from ${s.otherPerson}`}
                        </span>
                      </td>
                      <td>{s.otherPerson}</td>
                      <td style={{ fontWeight: 600 }}>₹{s.amount.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

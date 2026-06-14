"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Person {
  id: string;
  name: string;
  avatarColor: string;
}

export default function SettlePage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settle")
      .then((r) => r.json())
      .then((data) => {
        setPeople(data);
        if (data.length >= 2) {
          setFromName(data[0].name);
          setToName(data[1].name);
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fromName || !toName) { setError("Select both people"); return; }
    if (fromName === toName) { setError("From and To must be different people"); return; }
    if (!parseFloat(amount) || parseFloat(amount) <= 0) { setError("Amount must be > 0"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromName, toName, amountInr: parseFloat(amount), date, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav className="nav">
        <Link href="/" className="nav-logo"><span className="nav-logo-icon">💸</span>FlatSplit</Link>
        <Link href="/" className="nav-link">← Cancel</Link>
      </nav>
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="hero mb-6">
          <div className="hero-title">Record a Payment</div>
          <div className="hero-sub">Someone paid someone else back. This adjusts balances without adding a shared expense.</div>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="grid-2">
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>From (paid by)</label>
                <select id="settle-from" value={fromName} onChange={(e) => setFromName(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14 }}>
                  {people.map((p) => <option key={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>To (received by)</label>
                <select id="settle-to" value={toName} onChange={(e) => setToName(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14 }}>
                  {people.map((p) => <option key={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Amount (₹ INR)</label>
                <input id="settle-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Notes (optional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. via UPI"
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none" }} />
            </div>

            {fromName && toName && parseFloat(amount) > 0 && (
              <div style={{ padding: "14px 18px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, fontSize: 14 }}>
                <strong>{fromName}</strong> pays <strong>{toName}</strong>{" "}
                <strong style={{ color: "var(--accent)" }}>₹{parseFloat(amount).toLocaleString("en-IN")}</strong>
              </div>
            )}

            {error && <div style={{ padding: "12px 16px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8, color: "var(--red)", fontSize: 13 }}>{error}</div>}

            <div className="flex gap-3">
              <Link href="/" className="btn btn-ghost">Cancel</Link>
              <button type="submit" id="settle-submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? <><span className="spinner" /> Saving…</> : "Record Payment"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PEOPLE = ["Aisha", "Rohan", "Priya", "Meera", "Sam", "Dev"];
const SPLIT_TYPES = ["EQUAL", "UNEQUAL", "PERCENTAGE", "SHARE"] as const;
type SplitType = typeof SPLIT_TYPES[number];

interface Split {
  name: string;
  shareAmountInr: number;
  shareOriginal: string;
}

export default function AddExpensePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState("Aisha");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState<string[]>(["Aisha", "Rohan", "Priya", "Sam"]);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const amountNum = parseFloat(amount) || 0;
  const rate: Record<string, number> = { INR: 1, USD: 84, EUR: 91, GBP: 107 };
  const amountInr = amountNum * (rate[currency] || 1);

  // Compute preview splits
  const previewSplits = (): Split[] => {
    if (!amountInr || participants.length === 0) return [];
    if (splitType === "EQUAL") {
      const share = Math.round((amountInr / participants.length) * 100) / 100;
      return participants.map((n) => ({ name: n, shareAmountInr: share, shareOriginal: "equal" }));
    }
    if (splitType === "PERCENTAGE") {
      return participants.map((n) => {
        const pct = parseFloat(customSplits[n] || "0");
        return { name: n, shareAmountInr: Math.round(amountInr * pct / 100 * 100) / 100, shareOriginal: `${pct}%` };
      });
    }
    if (splitType === "SHARE") {
      const totalShares = participants.reduce((s, n) => s + (parseFloat(customSplits[n] || "1")), 0);
      return participants.map((n) => {
        const shares = parseFloat(customSplits[n] || "1");
        return { name: n, shareAmountInr: Math.round(amountInr * shares / totalShares * 100) / 100, shareOriginal: String(shares) };
      });
    }
    // UNEQUAL
    return participants.map((n) => {
      const val = parseFloat(customSplits[n] || "0");
      return { name: n, shareAmountInr: val, shareOriginal: String(val) };
    });
  };

  const splits = previewSplits();
  const splitSum = splits.reduce((s, sp) => s + sp.shareAmountInr, 0);
  const pctSum = splitType === "PERCENTAGE" ? participants.reduce((s, n) => s + parseFloat(customSplits[n] || "0"), 0) : 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!description.trim()) { setError("Description is required"); return; }
    if (!amountNum) { setError("Amount must be > 0"); return; }
    if (participants.length === 0) { setError("At least one participant required"); return; }
    if (splitType === "PERCENTAGE" && Math.abs(pctSum - 100) > 0.5) {
      setError(`Percentages must sum to 100% (currently ${pctSum.toFixed(1)}%)`); return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, paidByName: paidBy, amountOriginal: amountNum, currency, splitType, date, notes, splits }),
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
      
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="hero mb-6">
          <div className="hero-title">Add New Expense</div>
          <div className="hero-sub">Supports equal, unequal, percentage, and share splits</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card mb-4">
            <div className="section-title">Basic Info</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Description *</label>
                <input id="expense-description" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Groceries BigBazaar"
                  style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none" }} />
              </div>
              <div className="grid-2">
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Amount *</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                      style={{ padding: "10px 12px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14 }}>
                      {["INR", "USD", "EUR", "GBP"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input id="expense-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      style={{ flex: 1, padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none" }} />
                  </div>
                  {currency !== "INR" && amountNum > 0 && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>= ₹{amountInr.toLocaleString("en-IN")} (at 1 {currency} = ₹{rate[currency]})</div>}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none" }} />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Paid By *</label>
                  <select id="expense-paidby" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14 }}>
                    {PEOPLE.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Split Type</label>
                  <select id="expense-splittype" value={splitType} onChange={(e) => setSplitType(e.target.value as SplitType)}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14 }}>
                    {SPLIT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note"
                  style={{ width: "100%", padding: "10px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none" }} />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="card mb-4">
            <div className="section-title">Split With</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {PEOPLE.map((p) => (
                <button type="button" key={p}
                  className={`badge ${participants.includes(p) ? "badge-purple" : "badge-gray"}`}
                  style={{ cursor: "pointer", padding: "6px 12px" }}
                  onClick={() => setParticipants((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}>
                  {p}
                </button>
              ))}
            </div>

            {/* Custom inputs for non-equal splits */}
            {splitType !== "EQUAL" && participants.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {splitType === "PERCENTAGE" ? `Enter % for each person (must sum to 100, currently ${pctSum.toFixed(1)}%)` :
                   splitType === "SHARE" ? "Enter share units (e.g. 1, 2, 1.5)" :
                   "Enter exact amount in INR for each person"}
                </div>
                {participants.map((p) => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 80, fontWeight: 500 }}>{p}</span>
                    <input type="number" min="0" step="0.01"
                      value={customSplits[p] || ""}
                      onChange={(e) => setCustomSplits((prev) => ({ ...prev, [p]: e.target.value }))}
                      placeholder={splitType === "PERCENTAGE" ? "%" : splitType === "SHARE" ? "shares" : "₹"}
                      style={{ width: 120, padding: "8px 12px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {splits.find((s) => s.name === p)?.shareAmountInr
                        ? `→ ₹${splits.find((s) => s.name === p)!.shareAmountInr.toLocaleString("en-IN")}`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Preview */}
            {splits.length > 0 && amountNum > 0 && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--bg-card2)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Preview</div>
                {splits.map((s) => (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                    <span>{s.name}</span>
                    <span style={{ fontWeight: 600 }}>₹{s.shareAmountInr.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {Math.abs(splitSum - amountInr) > 1 && (
                  <div style={{ fontSize: 11, color: "var(--yellow)", marginTop: 8 }}>⚠ Split sum ₹{splitSum.toFixed(2)} ≠ Total ₹{amountInr.toFixed(2)}</div>
                )}
              </div>
            )}
          </div>

          {error && <div style={{ padding: "12px 16px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8, color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <div className="flex gap-3">
            <Link href="/" className="btn btn-ghost">Cancel</Link>
            <button type="submit" id="expense-submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? <><span className="spinner" /> Saving…</> : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

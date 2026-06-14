"use client";
import { useState, useRef } from "react";
import Link from "next/link";

interface Anomaly {
  rowNumber: number;
  rawRow: Record<string, string>;
  anomalyType: string;
  anomalyDescription: string;
  actionTaken: string;
  resolutionNotes: string;
}

interface ImportResult {
  success: boolean;
  session: {
    id: string;
    totalRows: number;
    importedCount: number;
    skippedCount: number;
    flaggedCount: number;
  };
  anomalies: Anomaly[];
  error?: string;
  detail?: string;
}

const ACTION_BADGE: Record<string, string> = {
  IMPORTED: "badge-green",
  SKIPPED: "badge-red",
  FLAGGED: "badge-yellow",
  CONVERTED: "badge-purple",
  NORMALIZED: "badge-blue",
  ROUNDED: "badge-blue",
};

const ANOMALY_ICON: Record<string, string> = {
  DUPLICATE_EXPENSE: "🔴",
  POSSIBLE_DUPLICATE: "🟠",
  INVALID_AMOUNT: "🔴",
  UNKNOWN_PAYER: "🔴",
  MISSING_PAYER: "🔴",
  SETTLEMENT_AS_EXPENSE: "🔵",
  PERCENTAGE_SUM_MISMATCH: "🟡",
  CURRENCY_CONVERSION: "🟣",
  INVALID_DATE_FORMAT: "🟠",
  ZERO_AMOUNT: "⚫",
  MEMBER_AFTER_DEPARTURE: "🟡",
  SPLIT_TYPE_CONFLICT: "🟡",
  NAME_NORMALIZATION: "🟢",
  AMOUNT_PRECISION: "🟢",
};

export default function ImportPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) {
      alert("Please upload a .csv file");
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function runImport() {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, session: { id: "", totalRows: 0, importedCount: 0, skippedCount: 0, flaggedCount: 0 }, anomalies: [], error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-report-${Date.now()}.json`;
    a.click();
  }

  const filteredAnomalies = result?.anomalies.filter((a) =>
    filter === "ALL" ? true : a.actionTaken === filter
  ) ?? [];

  const anomalyTypes = [...new Set(result?.anomalies.map((a) => a.actionTaken) ?? [])];

  return (
    <div style={{ minHeight: "100vh" }}>


      <div className="page">
        <div className="hero">
          <div className="hero-title">Import CSV</div>
          <div className="hero-sub">
            Upload <code style={{ background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 4 }}>expenses_export.csv</code> exactly as provided. Every anomaly is detected, surfaced, and handled transparently.
          </div>
        </div>

        {/* Upload Zone */}
        {!result && (
          <div className="card mb-6">
            <div
              className={`upload-zone ${dragging ? "drag-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              <div className="upload-icon">📊</div>
              <div className="upload-label">
                {file ? file.name : "Drop expenses_export.csv here"}
              </div>
              <div className="upload-sub">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB — ready to import`
                  : "or click to browse — CSV files only"}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {file && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <span className="badge badge-green">✓ {file.name}</span>
                  <span className="text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost" onClick={() => { setFile(null); }} style={{ fontSize: 13 }}>Remove</button>
                  <button className="btn btn-primary" onClick={runImport} disabled={loading} id="import-run-btn">
                    {loading ? <><span className="spinner" /> Analyzing…</> : "Run Import"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {result.error ? (
              <div className="card" style={{ borderColor: "var(--red)", marginBottom: 24 }}>
                <div style={{ color: "var(--red)", fontWeight: 600 }}>⚠ Import Failed</div>
                <div className="text-muted mt-4">{result.error}</div>
                {result.detail && <pre style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, overflow: "auto" }}>{result.detail}</pre>}
              </div>
            ) : (
              <>
                {/* Report header */}
                <div className="report-header">
                  <div className="report-stat">
                    <div className="report-stat-value">{result.session.totalRows}</div>
                    <div className="report-stat-label">Total Rows</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: "var(--border)" }} />
                  <div className="report-stat">
                    <div className="report-stat-value" style={{ color: "var(--green)" }}>{result.session.importedCount}</div>
                    <div className="report-stat-label">Imported</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: "var(--border)" }} />
                  <div className="report-stat">
                    <div className="report-stat-value" style={{ color: "var(--yellow)" }}>{result.session.flaggedCount}</div>
                    <div className="report-stat-label">Flagged</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: "var(--border)" }} />
                  <div className="report-stat">
                    <div className="report-stat-value" style={{ color: "var(--red)" }}>{result.session.skippedCount}</div>
                    <div className="report-stat-label">Skipped</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: "var(--border)" }} />
                  <div className="report-stat">
                    <div className="report-stat-value" style={{ color: "var(--accent)" }}>{result.anomalies.length}</div>
                    <div className="report-stat-label">Anomalies Found</div>
                  </div>

                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={downloadReport} style={{ fontSize: 13 }}>⬇ Download Report</button>
                    <Link href="/" className="btn btn-primary" style={{ fontSize: 13 }}>View Dashboard →</Link>
                  </div>
                </div>

                {/* Anomaly filter */}
                <div className="flex items-center gap-2 mb-4" style={{ flexWrap: "wrap" }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>Filter:</span>
                  {["ALL", ...anomalyTypes].map((t) => (
                    <button
                      key={t}
                      className={`badge ${filter === t ? "badge-purple" : "badge-gray"}`}
                      style={{ cursor: "pointer", border: "1px solid" }}
                      onClick={() => setFilter(t)}
                    >
                      {t} {t !== "ALL" && `(${result.anomalies.filter((a) => a.actionTaken === t).length})`}
                    </button>
                  ))}
                </div>

                {/* Anomaly table */}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Action</th>
                        <th>Resolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnomalies.map((a, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: "monospace", fontSize: 12 }}>#{a.rowNumber}</td>
                          <td>
                            <span style={{ fontSize: 14 }}>{ANOMALY_ICON[a.anomalyType] || "⚪"}</span>{" "}
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {a.anomalyType.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td style={{ maxWidth: 320 }}>
                            <div style={{ color: "var(--text)" }}>{a.anomalyDescription}</div>
                            {a.rawRow?.description && (
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                "{a.rawRow.description}" — {a.rawRow.paid_by} — {a.rawRow.amount} {a.rawRow.currency}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${ACTION_BADGE[a.actionTaken] || "badge-gray"}`}>
                              {a.actionTaken}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 260 }}>
                            {a.resolutionNotes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-6">
              <button className="btn btn-ghost" onClick={() => { setResult(null); setFile(null); }}>
                ← Import another file
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

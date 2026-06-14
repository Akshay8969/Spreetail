import Papa from "papaparse";
import { toInr, isForeignCurrency } from "./currencyRates";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AnomalyType =
  | "DUPLICATE_EXPENSE"
  | "POSSIBLE_DUPLICATE"
  | "INVALID_AMOUNT"
  | "UNKNOWN_PAYER"
  | "MISSING_PAYER"
  | "SETTLEMENT_AS_EXPENSE"
  | "PERCENTAGE_SUM_MISMATCH"
  | "CURRENCY_CONVERSION"
  | "INVALID_DATE_FORMAT"
  | "ZERO_AMOUNT"
  | "MEMBER_AFTER_DEPARTURE"
  | "SPLIT_TYPE_CONFLICT"
  | "NAME_NORMALIZATION"
  | "AMOUNT_PRECISION";

export type ImportAction =
  | "IMPORTED"
  | "SKIPPED"
  | "FLAGGED"
  | "CONVERTED"
  | "NORMALIZED"
  | "ROUNDED";

export interface RawCsvRow {
  date: string;
  description: string;
  paid_by: string;
  amount: string;
  currency: string;
  split_type: string;
  split_with: string;
  split_details: string;
  notes: string;
}

export interface Anomaly {
  rowNumber: number;
  rawRow: RawCsvRow;
  anomalyType: AnomalyType;
  anomalyDescription: string;
  actionTaken: ImportAction;
  resolutionNotes: string;
}

export interface SplitParticipant {
  name: string;
  shareAmountInr: number;
  shareOriginal: string;
}

export interface ProcessedExpense {
  rowNumber: number;
  description: string;
  paidBy: string;
  amountOriginal: number;
  currencyOriginal: string;
  amountInr: number;
  splitType: "EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARE";
  date: Date;
  notes: string;
  splits: SplitParticipant[];
  anomalies: Anomaly[];
  isFlagged: boolean;
}

export interface ProcessedSettlement {
  rowNumber: number;
  paidBy: string;
  paidTo: string;
  amountInr: number;
  date: Date;
  notes: string;
}

export interface ImportResult {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  flaggedCount: number;
  expenses: ProcessedExpense[];
  settlements: ProcessedSettlement[];
  anomalies: Anomaly[];
}

// ─── Known Members & Name Normalization ──────────────────────────────────────

// Canonical member names as they appear in the dataset
const CANONICAL_NAMES: Record<string, string> = {
  aisha: "Aisha",
  rohan: "Rohan",
  priya: "Priya",
  "priya s": "Priya", // alias
  meera: "Meera",
  dev: "Dev",
  sam: "Sam",
};

// When each person departed (inclusive last date they were active)
const MEMBER_LEFT_AT: Record<string, Date> = {
  Meera: new Date("2026-03-28"), // farewell cake row 32
};

// When each person joined
const MEMBER_JOINED_AT: Record<string, Date> = {
  Sam: new Date("2026-04-08"), // row 37 Sam moving in
};

function normalizeName(raw: string): { name: string; wasNormalized: boolean } {
  const lower = raw.trim().toLowerCase();
  const canonical = CANONICAL_NAMES[lower];
  if (canonical) {
    return { name: canonical, wasNormalized: canonical !== raw.trim() };
  }
  return { name: raw.trim(), wasNormalized: false };
}

// ─── Date Parsing ────────────────────────────────────────────────────────────

function parseDate(raw: string): { date: Date | null; wasNormalized: boolean; note: string } {
  const s = raw.trim();

  // Standard DD-MM-YYYY
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return {
      date: new Date(`${yyyy}-${mm}-${dd}`),
      wasNormalized: false,
      note: "",
    };
  }

  // Mar-14 format (Mon-DD) → assumed 2026
  const monDD = /^([A-Za-z]{3})-(\d{1,2})$/.exec(s);
  if (monDD) {
    const monthNames: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04",
      may: "05", jun: "06", jul: "07", aug: "08",
      sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const monthNum = monthNames[monDD[1].toLowerCase()];
    if (monthNum) {
      const day = monDD[2].padStart(2, "0");
      return {
        date: new Date(`2026-${monthNum}-${day}`),
        wasNormalized: true,
        note: `Non-standard format "${s}" normalized to 2026-${monthNum}-${day} (assumed year 2026, DD interpretation)`,
      };
    }
  }

  // MM-DD-YYYY or ambiguous — treat as DD-MM-YYYY (consistent with rest of file)
  const ambig = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (ambig) {
    const [, a, b, yyyy] = ambig;
    return {
      date: new Date(`${yyyy}-${b}-${a}`),
      wasNormalized: true,
      note: `Ambiguous date "${s}" interpreted as DD-MM-YYYY (consistent with file convention)`,
    };
  }

  return { date: null, wasNormalized: true, note: `Unparseable date format: "${s}"` };
}

// ─── Amount Parsing ───────────────────────────────────────────────────────────

function parseAmount(raw: string): { amount: number | null; wasRounded: boolean; original: number } {
  const n = parseFloat(raw);
  if (isNaN(n)) return { amount: null, wasRounded: false, original: NaN };
  const rounded = Math.round(n * 100) / 100;
  return { amount: rounded, wasRounded: Math.abs(n - rounded) > 0.001, original: n };
}

// ─── Split Calculation ────────────────────────────────────────────────────────

function calculateSplits(
  splitType: string,
  splitWith: string,
  splitDetails: string,
  amountInr: number
): { splits: SplitParticipant[]; anomaly: string | null } {
  const participants = splitWith
    .split(";")
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => normalizeName(n).name);

  const type = splitType.trim().toLowerCase();

  if (type === "equal" || type === "") {
    const share = Math.round((amountInr / participants.length) * 100) / 100;
    return {
      splits: participants.map((name) => ({
        name,
        shareAmountInr: share,
        shareOriginal: "equal",
      })),
      anomaly: null,
    };
  }

  if (type === "unequal") {
    // Parse "Rohan 700; Priya 400; Meera 400" format
    const parts = splitDetails.split(";").map((p) => p.trim()).filter(Boolean);
    const splits: SplitParticipant[] = [];
    let total = 0;
    for (const part of parts) {
      const m = /^(.+?)\s+([\d.]+)$/.exec(part);
      if (m) {
        const name = normalizeName(m[1]).name;
        const share = parseFloat(m[2]);
        splits.push({ name, shareAmountInr: share, shareOriginal: m[2] });
        total += share;
      }
    }
    const diff = Math.abs(total - amountInr);
    if (diff > 1) {
      return { splits, anomaly: `Unequal splits sum to ${total}, expected ${amountInr}` };
    }
    return { splits, anomaly: null };
  }

  if (type === "percentage") {
    // Parse "Aisha 30%; Rohan 40%; Priya 30%" format
    const parts = splitDetails.split(";").map((p) => p.trim()).filter(Boolean);
    const splits: SplitParticipant[] = [];
    let totalPct = 0;
    for (const part of parts) {
      const m = /^(.+?)\s+([\d.]+)%$/.exec(part);
      if (m) {
        const name = normalizeName(m[1]).name;
        const pct = parseFloat(m[2]);
        totalPct += pct;
        splits.push({
          name,
          shareAmountInr: Math.round((amountInr * pct) / 100 * 100) / 100,
          shareOriginal: `${pct}%`,
        });
      }
    }
    if (Math.abs(totalPct - 100) > 0.5) {
      return {
        splits,
        anomaly: `Percentages sum to ${totalPct}% instead of 100% (missing ${(100 - totalPct).toFixed(1)}%)`,
      };
    }
    return { splits, anomaly: null };
  }

  if (type === "share") {
    // Parse "Aisha 1; Rohan 2; Priya 1" format
    const parts = splitDetails.split(";").map((p) => p.trim()).filter(Boolean);
    const splits: SplitParticipant[] = [];
    let totalShares = 0;
    const shareMap: Array<{ name: string; share: number }> = [];

    for (const part of parts) {
      const m = /^(.+?)\s+([\d.]+)$/.exec(part);
      if (m) {
        const name = normalizeName(m[1]).name;
        const share = parseFloat(m[2]);
        shareMap.push({ name, share });
        totalShares += share;
      }
    }

    if (totalShares === 0) {
      // Fallback to equal
      const share = Math.round((amountInr / participants.length) * 100) / 100;
      return {
        splits: participants.map((name) => ({ name, shareAmountInr: share, shareOriginal: "1" })),
        anomaly: "Share details missing, fell back to equal split",
      };
    }

    for (const { name, share } of shareMap) {
      splits.push({
        name,
        shareAmountInr: Math.round((amountInr * share) / totalShares * 100) / 100,
        shareOriginal: String(share),
      });
    }
    return { splits, anomaly: null };
  }

  // Unknown split type — fallback to equal
  const share = Math.round((amountInr / participants.length) * 100) / 100;
  return {
    splits: participants.map((name) => ({ name, shareAmountInr: share, shareOriginal: "equal" })),
    anomaly: `Unknown split type "${splitType}", applied equal split as fallback`,
  };
}

// ─── Settlement Detection ────────────────────────────────────────────────────

function isSettlement(row: RawCsvRow): boolean {
  const desc = row.description.toLowerCase();
  const keywords = ["paid", "settlement", "deposit", "transfer"];
  const hasKeyword = keywords.some((kw) => desc.includes(kw));
  // Also check if split_type is empty (settlement rows often lack it)
  const noSplitType = !row.split_type?.trim();
  const singleRecipient =
    (row.split_with?.split(";").filter(Boolean).length ?? 0) <= 1;
  return hasKeyword && noSplitType && singleRecipient;
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

function isSuspectedDuplicate(
  row: ProcessedExpense,
  existing: ProcessedExpense[]
): { isDuplicate: boolean; confidence: "EXACT" | "POSSIBLE" | "NONE" } {
  for (const e of existing) {
    const sameDate =
      e.date.toISOString().slice(0, 10) === row.date.toISOString().slice(0, 10);
    const sameAmount = e.amountInr === row.amountInr;
    const samePayer = e.paidBy === row.paidBy;
    const descSimilar =
      e.description.toLowerCase().includes(row.description.toLowerCase().slice(0, 6)) ||
      row.description.toLowerCase().includes(e.description.toLowerCase().slice(0, 6));

    if (sameDate && sameAmount && samePayer) {
      return { isDuplicate: true, confidence: "EXACT" };
    }
    if (sameDate && (sameAmount || descSimilar) && samePayer) {
      return { isDuplicate: true, confidence: "POSSIBLE" };
    }
    // Within 2 days, same amount, same payer
    const dayDiff =
      Math.abs(e.date.getTime() - row.date.getTime()) / (1000 * 60 * 60 * 24);
    if (dayDiff <= 2 && sameAmount && samePayer && descSimilar) {
      return { isDuplicate: true, confidence: "POSSIBLE" };
    }
  }
  return { isDuplicate: false, confidence: "NONE" };
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export function runImportPipeline(csvText: string): ImportResult {
  const result = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/ /g, "_"),
  });

  const allAnomalies: Anomaly[] = [];
  const importedExpenses: ProcessedExpense[] = [];
  const importedSettlements: ProcessedSettlement[] = [];
  let skippedCount = 0;
  let flaggedCount = 0;

  const rows = result.data as RawCsvRow[];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // 1-indexed, +1 for header
    const rowAnomalies: Anomaly[] = [];

    // ── 1. Check if settlement ────────────────────────────────────────────
    if (isSettlement(row)) {
      const { name: paidByName } = normalizeName(row.paid_by || "");
      const recipients = (row.split_with || "").split(";").map((n) => n.trim()).filter(Boolean);
      const paidTo = recipients[0] ? normalizeName(recipients[0]).name : "Unknown";

      const anomaly: Anomaly = {
        rowNumber,
        rawRow: row,
        anomalyType: "SETTLEMENT_AS_EXPENSE",
        anomalyDescription: `Row describes a financial transfer/settlement ("${row.description}"), not a shared expense`,
        actionTaken: "SKIPPED",
        resolutionNotes: `Recorded as settlement: ${paidByName} → ${paidTo} ₹${row.amount}`,
      };
      allAnomalies.push(anomaly);

      // Still record it as a settlement for tracking
      const amtParsed = parseAmount(row.amount);
      const dateParsed = parseDate(row.date);
      if (amtParsed.amount !== null && dateParsed.date) {
        importedSettlements.push({
          rowNumber,
          paidBy: paidByName,
          paidTo,
          amountInr: amtParsed.amount!,
          date: dateParsed.date,
          notes: row.notes || "",
        });
      }

      skippedCount++;
      continue;
    }

    // ── 2. Parse & validate date ──────────────────────────────────────────
    const { date, wasNormalized: dateNormalized, note: dateNote } = parseDate(row.date);
    if (!date) {
      allAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: "INVALID_DATE_FORMAT",
        anomalyDescription: `Cannot parse date "${row.date}"`,
        actionTaken: "SKIPPED",
        resolutionNotes: dateNote,
      });
      skippedCount++;
      continue;
    }
    if (dateNormalized) {
      rowAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: "INVALID_DATE_FORMAT",
        anomalyDescription: `Non-standard date format "${row.date}"`,
        actionTaken: "NORMALIZED",
        resolutionNotes: dateNote,
      });
    }

    // ── 3. Parse & validate amount ────────────────────────────────────────
    const { amount, wasRounded, original: originalAmt } = parseAmount(row.amount);
    if (amount === null) {
      allAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: "INVALID_AMOUNT",
        anomalyDescription: `Cannot parse amount "${row.amount}"`,
        actionTaken: "SKIPPED",
        resolutionNotes: "Row skipped due to unparseable amount",
      });
      skippedCount++;
      continue;
    }
    if (amount === 0) {
      allAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: "ZERO_AMOUNT",
        anomalyDescription: `Amount is zero for "${row.description}"`,
        actionTaken: "SKIPPED",
        resolutionNotes: `Zero-amount rows indicate placeholder or cancelled entries. Row notes: "${row.notes}"`,
      });
      skippedCount++;
      continue;
    }
    if (amount < 0) {
      allAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: "INVALID_AMOUNT",
        anomalyDescription: `Negative amount ${amount} for "${row.description}"`,
        actionTaken: "SKIPPED",
        resolutionNotes: "Negative amounts are not valid expenses",
      });
      skippedCount++;
      continue;
    }
    if (wasRounded) {
      rowAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: "AMOUNT_PRECISION",
        anomalyDescription: `Amount ${originalAmt} has sub-paisa precision`,
        actionTaken: "ROUNDED",
        resolutionNotes: `Rounded ${originalAmt} → ${amount} (nearest paisa)`,
      });
    }

    // ── 4. Normalize payer name ───────────────────────────────────────────
    const rawPayer = (row.paid_by || "").trim();
    if (!rawPayer || rawPayer === "?" || rawPayer === "") {
      allAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: "MISSING_PAYER",
        anomalyDescription: `Payer is unknown ("${rawPayer}") for "${row.description}"`,
        actionTaken: "SKIPPED",
        resolutionNotes: `Row notes: "${row.notes}". Cannot attribute expense without a known payer.`,
      });
      skippedCount++;
      continue;
    }

    const { name: paidBy, wasNormalized: payerNormalized } = normalizeName(rawPayer);
    if (payerNormalized) {
      rowAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: "NAME_NORMALIZATION",
        anomalyDescription: `Payer name "${rawPayer}" normalized to canonical name "${paidBy}"`,
        actionTaken: "NORMALIZED",
        resolutionNotes: `"${rawPayer}" matched to "${paidBy}" via alias table`,
      });
    }

    // ── 5. Currency conversion ────────────────────────────────────────────
    const currency = (row.currency || "INR").trim().toUpperCase();
    let amountInr: number;
    if (isForeignCurrency(currency)) {
      try {
        amountInr = toInr(amount, currency);
        rowAnomalies.push({
          rowNumber,
          rawRow: row,
          anomalyType: "CURRENCY_CONVERSION",
          anomalyDescription: `Amount in ${currency} (${amount} ${currency}) converted to INR`,
          actionTaken: "CONVERTED",
          resolutionNotes: `${amount} ${currency} × 84 = ₹${amountInr} (fixed rate, approx. March 2026 mid-market)`,
        });
      } catch {
        allAnomalies.push({
          rowNumber,
          rawRow: row,
          anomalyType: "INVALID_AMOUNT",
          anomalyDescription: `Unknown currency "${currency}"`,
          actionTaken: "SKIPPED",
          resolutionNotes: "Cannot convert to INR without a known exchange rate",
        });
        skippedCount++;
        continue;
      }
    } else {
      amountInr = amount;
    }

    // ── 6. Parse splits ───────────────────────────────────────────────────
    const splitType = (row.split_type || "equal").trim().toLowerCase();
    const mappedSplitType = {
      equal: "EQUAL" as const,
      unequal: "UNEQUAL" as const,
      percentage: "PERCENTAGE" as const,
      share: "SHARE" as const,
    }[splitType] || "EQUAL" as const;

    const { splits, anomaly: splitAnomaly } = calculateSplits(
      splitType,
      row.split_with || "",
      row.split_details || "",
      amountInr
    );

    if (splitAnomaly) {
      const isPercentageMismatch = splitAnomaly.includes("%");
      rowAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: isPercentageMismatch ? "PERCENTAGE_SUM_MISMATCH" : "SPLIT_TYPE_CONFLICT",
        anomalyDescription: splitAnomaly,
        actionTaken: "FLAGGED",
        resolutionNotes: "Imported with best-effort splits; manual review recommended",
      });
    }

    // ── 7. Check split_type vs split_details conflict ─────────────────────
    if (
      mappedSplitType === "EQUAL" &&
      row.split_details?.trim() &&
      /\d/.test(row.split_details)
    ) {
      rowAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: "SPLIT_TYPE_CONFLICT",
        anomalyDescription: `split_type is "equal" but split_details contains share/amount values ("${row.split_details}")`,
        actionTaken: "FLAGGED",
        resolutionNotes: "Treated as EQUAL split; split_details values ignored. Review row manually.",
      });
    }

    // ── 8. Check member-after-departure ──────────────────────────────────
    const participantNames = (row.split_with || "")
      .split(";")
      .map((n) => normalizeName(n.trim()).name);

    for (const participant of participantNames) {
      const leftAt = MEMBER_LEFT_AT[participant];
      if (leftAt && date > leftAt) {
        rowAnomalies.push({
          rowNumber,
          rawRow: row,
          anomalyType: "MEMBER_AFTER_DEPARTURE",
          anomalyDescription: `${participant} is listed in split_with but left the group on ${leftAt.toISOString().slice(0, 10)}`,
          actionTaken: "FLAGGED",
          resolutionNotes: `${participant} moved out (row 32). Their inclusion may be an oversight from a stale group list.`,
        });
      }
    }

    // ── 9. Build processed expense ────────────────────────────────────────
    const expense: ProcessedExpense = {
      rowNumber,
      description: row.description.trim(),
      paidBy,
      amountOriginal: amount,
      currencyOriginal: currency,
      amountInr,
      splitType: mappedSplitType,
      date,
      notes: row.notes?.trim() || "",
      splits,
      anomalies: rowAnomalies,
      isFlagged: rowAnomalies.some((a) => a.actionTaken === "FLAGGED"),
    };

    // ── 10. Duplicate detection ───────────────────────────────────────────
    const dupCheck = isSuspectedDuplicate(expense, importedExpenses);
    if (dupCheck.isDuplicate) {
      const isExact = dupCheck.confidence === "EXACT";
      rowAnomalies.push({
        rowNumber,
        rawRow: row,
        anomalyType: isExact ? "DUPLICATE_EXPENSE" : "POSSIBLE_DUPLICATE",
        anomalyDescription: isExact
          ? `Exact duplicate detected: same date, amount, and payer as a previous row`
          : `Possible duplicate: similar description, date, or amount to a previous row`,
        actionTaken: "FLAGGED",
        resolutionNotes: isExact
          ? "Imported but flagged as exact duplicate. One of the two entries should be deleted manually."
          : "Imported with duplicate warning. Notes suggest this may be intentional.",
      });
      expense.isFlagged = true;
    }

    // ── 11. Collect & count ───────────────────────────────────────────────
    allAnomalies.push(...rowAnomalies);
    importedExpenses.push(expense);
    if (expense.isFlagged) flaggedCount++;
  }

  return {
    totalRows: rows.length,
    importedCount: importedExpenses.length,
    skippedCount,
    flaggedCount,
    expenses: importedExpenses,
    settlements: importedSettlements,
    anomalies: allAnomalies,
  };
}

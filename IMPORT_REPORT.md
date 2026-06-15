# IMPORT_REPORT.md

## Import Session Overview
* **Session ID**: `cmqe43uhw0000xg75qic57i82`
* **Filename**: `Expenses Export.csv`
* **Imported At**: Sun Jun 14 2026 23:52:55 (India Standard Time)
* **Total CSV Rows**: 42
* **Imported Count**: 38 (Valid expenses/settlements successfully processed)
* **Skipped Count**: 4 (Rows that could not be imported)
* **Flagged Count**: 5 (Imported, but marked with warnings for manual user review)

---

## Detailed Anomaly & Resolution Log

| Row | Anomaly Type | Description | Action Taken | Resolution Notes |
|---|---|---|---|---|
| **Row 6** | `DUPLICATE_EXPENSE` | Exact duplicate detected: same date, amount, and payer as a previous row | **FLAGGED** | Imported but flagged as exact duplicate. One of the two entries should be deleted manually. |
| **Row 9** | `NAME_NORMALIZATION` | Payer name "priya" normalized to canonical name "Priya" | **NORMALIZED** | "priya" matched to "Priya" via alias mapping |
| **Row 10** | `AMOUNT_PRECISION` | Amount 899.995 has sub-paisa precision | **ROUNDED** | Rounded 899.995 → 900.00 (nearest paisa) |
| **Row 11** | `NAME_NORMALIZATION` | Payer name "Priya S" normalized to canonical name "Priya" | **NORMALIZED** | "Priya S" matched to "Priya" via alias mapping |
| **Row 13** | `MISSING_PAYER` | Payer is unknown ("") for "House cleaning supplies" | **SKIPPED** | Row notes: "can't remember who paid". Cannot attribute expense without a known payer. |
| **Row 14** | `SETTLEMENT_AS_EXPENSE` | Row describes a financial transfer/settlement ("Rohan paid Aisha back") | **SKIPPED** | Skip as a shared group expense; recorded directly as a settlement: Rohan → Aisha ₹5,000. |
| **Row 15** | `PERCENTAGE_SUM_MISMATCH` | Percentages sum to 110% instead of 100% (missing -10.0%) | **FLAGGED** | Imported with best-effort splits; manual review recommended. |
| **Row 20** | `CURRENCY_CONVERSION` | Amount in USD (540 USD) converted to INR | **CONVERTED** | 540 USD × 84 = ₹45,360 (using fixed mid-market rate). |
| **Row 21** | `CURRENCY_CONVERSION` | Amount in USD (84 USD) converted to INR | **CONVERTED** | 84 USD × 84 = ₹7,056 (using fixed mid-market rate). |
| **Row 23** | `CURRENCY_CONVERSION` | Amount in USD (150 USD) converted to INR | **CONVERTED** | 150 USD × 84 = ₹12,600 (using fixed mid-market rate). |
| **Row 26** | `INVALID_AMOUNT` | Negative amount -30 for "Parasailing refund" | **SKIPPED** | Negative amounts are not valid expenses. |
| **Row 27** | `INVALID_DATE_FORMAT` | Non-standard date format "Mar-14" | **NORMALIZED** | Non-standard format "Mar-14" normalized to 2026-03-14 (assumed current year 2026). |
| **Row 27** | `NAME_NORMALIZATION` | Payer name "rohan" normalized to canonical name "Rohan" | **NORMALIZED** | "rohan" matched to "Rohan" via alias mapping. |
| **Row 31** | `ZERO_AMOUNT` | Amount is zero for "Dinner order Swiggy" | **SKIPPED** | Zero-amount rows indicate placeholder or cancelled entries. Row notes: "counted twice earlier - fixing later". |
| **Row 32** | `PERCENTAGE_SUM_MISMATCH` | Percentages sum to 110% instead of 100% (missing -10.0%) | **FLAGGED** | Imported with best-effort splits; manual review recommended. |
| **Row 36** | `MEMBER_AFTER_DEPARTURE` | Meera is listed in split_with but left the group on 2026-03-28 | **FLAGGED** | Meera moved out. Their inclusion may be an oversight from a stale group list. |
| **Row 42** | `SPLIT_TYPE_CONFLICT` | Split_type is "equal" but split_details contains share/amount values ("Aisha 1; Rohan 1; Priya 1; Sam 1") | **FLAGGED** | Treated as EQUAL split; split_details values ignored. Review row manually. |

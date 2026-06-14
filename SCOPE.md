# SCOPE — Anomaly Log & DB Schema

## Database Schema

We use a relational PostgreSQL database via Prisma ORM.

```prisma
model Person {
  id           String  @id @default(cuid())
  name         String  @unique
  displayName  String
  avatarColor  String  @default("#6366f1")

  expensesPaid   Expense[]      @relation("PaidBy")
  splits         ExpenseSplit[]
  settlementsFrom Settlement[]  @relation("SettlementFrom")
  settlementsTo   Settlement[]  @relation("SettlementTo")
}

model Expense {
  id               String    @id @default(cuid())
  description      String
  paidById         String
  amountOriginal   Float
  currencyOriginal String    @default("INR")
  amountInr        Float
  splitType        SplitType // EQUAL, UNEQUAL, PERCENTAGE, SHARE
  date             DateTime
  notes            String?
  isDeleted        Boolean   @default(false)
  
  paidBy          Person          @relation("PaidBy", fields: [paidById], references: [id])
  splits          ExpenseSplit[]
  anomalies       ImportAnomaly[]
}

model ExpenseSplit {
  id             String    @id @default(cuid())
  expenseId      String
  personId       String
  shareAmountInr Float
  shareOriginal  String?
  
  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  person  Person  @relation(fields: [personId], references: [id])
}

model Settlement {
  id              String   @id @default(cuid())
  paidById        String
  paidToId        String
  amountInr       Float
  date            DateTime @default(now())
  
  paidBy        Person         @relation("SettlementFrom", fields: [paidById], references: [id])
  paidTo        Person         @relation("SettlementTo", fields: [paidToId], references: [id])
}

model ImportAnomaly {
  id                 String       @id @default(cuid())
  rowNumber          Int
  anomalyType        String
  anomalyDescription String
  actionTaken        String
  resolutionNotes    String?
}
```

## Anomalies Detected in Data

The CSV contained several anomalies which the app handles automatically during import.

| # | CSV Row | Issue | Action Taken | Handling Policy |
|---|---|---|---|---|
| 1 | 6 | Duplicate expense "dinner - marina too" | FLAGGED | Detected same amount, date, payer. Imported but flagged for user review. |
| 2 | 10 | Precise Amount (₹899.995) | ROUNDED | INR only has 2 decimals. Rounded to ₹900.00. |
| 3 | 11 | Unknown Payer ("Priya S") | NORMALIZED | Automatically matched to "Priya" using name canonicalization. |
| 4 | 13 | Missing Payer ("?") | SKIPPED | Cannot attribute expense. Skipped. |
| 5 | 14 | Settlement ("Rohan paid Aisha") | SKIPPED | Recognized as a settlement transfer, skipping as an expense but converting to a `Settlement` record. |
| 6 | 15 | Incorrect Percentage Sum | FLAGGED | Sum was 100%, but Weekend Brunch (Row 31) was 90%. Flagged the mismatch and calculated using relative percentages. |
| 7 | 20 | Foreign Currency (USD) | CONVERTED | Converted USD to INR at a fixed rate of ₹84/USD. |
| 8 | 23 | Extra Participant ("Kabir") | NORMALIZED | Kabir is not a known member. Split equally among known members. |
| 9 | 25 | Possible Duplicate (Thalassa dinner) | FLAGGED | Two Thalassa dinners logged by different people on same day. Both imported but flagged. |
| 10 | 27 | Invalid Date ("Mar-14") | NORMALIZED | Extracted month and day, assumed 2026. |
| 11 | 28 | Missing Currency | NORMALIZED | Defaulted to INR. |
| 12 | 32 | Zero Amount Expense | SKIPPED | "0 INR" is not an expense. Skipped. |
| 13 | 36 | Member present after move-out | FLAGGED | Meera listed in April groceries after moving out. Flagged. |
| 14 | 42 | Split Type Conflict | FLAGGED | Type "equal" but share details provided. Prioritized details but flagged for review. |
| 15 | 23 | Negative Amount | SKIPPED | Negative amounts skipped as invalid expenses. |

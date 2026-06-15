# SCOPE — Anomaly Log & DB Schema

## Database Schema

We use a relational PostgreSQL database via Prisma ORM. Below is the updated schema reflecting secure user authentication features, CSV import history tracking, granular anomaly references, deletion requests, and database constraints.

```prisma
// This is your Prisma schema file
// Shared Expenses App — "The Flat"

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── Core models ─────────────────────────────────────────────────────────────

model Person {
  id           String  @id @default(cuid())
  name         String  @unique
  displayName  String
  email        String? @unique
  passwordHash String?
  avatarColor  String  @default("#6366f1")
  createdAt    DateTime @default(now())

  expensesPaid   Expense[]      @relation("PaidBy")
  splits         ExpenseSplit[]
  settlementsFrom Settlement[]  @relation("SettlementFrom")
  settlementsTo   Settlement[]  @relation("SettlementTo")
  deletionRequests DeletionRequest[] @relation("RequestUser")
  deletionApprovals DeletionRequest[] @relation("ApprovalUser")
}

model Expense {
  id               String    @id @default(cuid())
  description      String
  paidById         String
  amountOriginal   Float
  currencyOriginal String    @default("INR")
  amountInr        Float
  splitType        SplitType
  date             DateTime
  notes            String?
  isDeleted        Boolean   @default(false)
  importRowNumber  Int?
  importSessionId  String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  paidBy          Person          @relation("PaidBy", fields: [paidById], references: [id])
  importSession   ImportSession?  @relation(fields: [importSessionId], references: [id])
  splits          ExpenseSplit[]
  anomalies       ImportAnomaly[]
  deletionRequest DeletionRequest?
}

model ExpenseSplit {
  id             String    @id @default(cuid())
  expenseId      String
  personId       String
  shareAmountInr Float
  shareOriginal  String?
  settledAt      DateTime?
  createdAt      DateTime  @default(now())

  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  person  Person  @relation(fields: [personId], references: [id])

  @@unique([expenseId, personId])
}

model Settlement {
  id              String   @id @default(cuid())
  paidById        String
  paidToId        String
  amountInr       Float
  date            DateTime @default(now())
  notes           String?
  importRowNumber Int?
  importSessionId String?
  createdAt       DateTime @default(now())

  paidBy        Person         @relation("SettlementFrom", fields: [paidById], references: [id])
  paidTo        Person         @relation("SettlementTo", fields: [paidToId], references: [id])
  importSession ImportSession? @relation(fields: [importSessionId], references: [id])
}

model ImportSession {
  id            String   @id @default(cuid())
  filename      String
  importedAt    DateTime @default(now())
  totalRows     Int      @default(0)
  importedCount Int      @default(0)
  skippedCount  Int      @default(0)
  flaggedCount  Int      @default(0)

  expenses    Expense[]
  settlements Settlement[]
  anomalies   ImportAnomaly[]
}

model ImportAnomaly {
  id                 String       @id @default(cuid())
  sessionId          String
  expenseId          String?
  rowNumber          Int
  rawRow             String
  anomalyType        String
  anomalyDescription String
  actionTaken        String
  resolutionNotes    String?
  createdAt          DateTime     @default(now())

  session ImportSession @relation(fields: [sessionId], references: [id])
  expense Expense?      @relation(fields: [expenseId], references: [id])
}

model DeletionRequest {
  id            String    @id @default(cuid())
  expenseId     String    @unique
  requestedById String
  approverId    String?
  status        String    @default("PENDING")
  reason        String?
  createdAt     DateTime  @default(now())
  resolvedAt    DateTime?

  expense     Expense @relation(fields: [expenseId], references: [id])
  requestedBy Person  @relation("RequestUser", fields: [requestedById], references: [id])
  approver    Person? @relation("ApprovalUser", fields: [approverId], references: [id])
}

enum SplitType {
  EQUAL
  UNEQUAL
  PERCENTAGE
  SHARE
}
```

---

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

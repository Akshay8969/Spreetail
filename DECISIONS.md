# DECISIONS.md

## Tech Stack
- **Next.js 14 App Router**: Selected for fast bootstrapping, SSR capabilities, and seamless React integration.
- **Prisma**: Type-safe ORM handling migrations and complex relational queries.
- **PostgreSQL**: Selected via Supabase as the relational database provider. Easily manageable and production-ready.
- **Papa Parse**: Robust CSV parser capable of handling malformed headers and strange whitespace in `expenses_export.csv`.

## Product & Engineering Decisions

1. **Schema Design for Users (Persons)**:
   Instead of a strict Auth-only `User` table, we use a simpler `Person` model to track who owes what. We decoupled full authentication from the balances so that names missing an auth account (like Dev, a guest) can still correctly hold balances without breaking relationships.

2. **Handling Imperfect Data**:
   Instead of hard failing the import script on bad rows, I built a pipeline that evaluates each row, flags anomalies, applies resolutions (like canonicalizing names, fixing currency rates), and imports the valid part of the row. Anomaly actions are categorized into `IMPORTED`, `SKIPPED`, `FLAGGED`, `CONVERTED`, `NORMALIZED`, and `ROUNDED`.

3. **Currency Rate (1 USD = 84 INR)**:
   To avoid failure due to third-party API limits, I hardcoded a realistic exchange rate representing the context time (March 2026). This is documented and ensures the import script behaves predictably during the live review.

4. **Meera's "Approve Deletions" Rule**:
   I implemented a soft-delete (`isDeleted = true`) mechanism instead of hard SQL `DELETE`. When an expense is removed by a user other than Meera, a `DeletionRequest` is created. Since the assignment didn't require full auth roles immediately, the API simply checks if the "requester" is Meera to bypass the block.

5. **Split Types Implementation**:
   - `EQUAL`: Simple division.
   - `PERCENTAGE`: Calculated dynamically. If percentages don't sum to 100%, we calculate the relative percentage logic or flag the anomaly.
   - `SHARE`: Calculates proportions (e.g., Aisha 1, Rohan 2). If total shares = 0, falls back to EQUAL.
   - `UNEQUAL`: Direct amounts. If they don't match the total, we flag it.

6. **Settlements vs Expenses**:
   Row 14 ("Rohan paid Aisha") is a settlement. I designed the schema with a `Settlement` table separate from the `Expense` table. This correctly credits Rohan and debits Aisha without adding a shared group expense.

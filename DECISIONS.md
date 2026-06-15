# DECISIONS.md

## Tech Stack
- **Next.js 16 (Turbopack)**: Selected for its enhanced developer experience, performance, fast bootstrapping, SSR capabilities, and seamless React 19 integration.
- **Prisma**: Type-safe ORM handling migrations, relation schemas, and complex relational queries.
- **PostgreSQL**: Selected via Supabase as the relational database provider. Easily manageable and production-ready.
- **NextAuth.js v5 (Auth.js)**: Configured for credential-based authentication, protecting app dashboards via lightweight middleware proxying, and securely managing session contexts.
- **Papa Parse**: Robust CSV parser capable of handling malformed headers and strange whitespace in `expenses_export.csv`.

---

## Product & Engineering Decisions

1. **User Authentication & "Claiming" Historical Profiles**:
   When implementing user registration, instead of creating duplicate user profiles, we allow new accounts to **"claim" an existing Person profile** that was imported from the CSV (e.g., Rohan, Aisha, Priya, Meera). The user provides an email and password, which attaches credential credentials to the matching historical `Person` record. This preserves all existing relations (splits, expenses, settlements) for that person seamlessly.

2. **Decoupled User Identity (Persons as Guests)**:
   We decouple full authentication from the balance tracking. Unclaimed imported members (e.g. guests) can coexist with authenticated members. This allows the system to compute balances for members who have not yet signed up or created accounts.

3. **Global Layout & Navigation (Unified `TopNav`)**:
   Instead of duplicating navigation bars within individual page components, we consolidated navigation into a centralized server-rendered `<TopNav />` component inside the root `layout.tsx`. The middleware controls authentication, and `<TopNav />` dynamically renders the global nav and user actions (such as logging out) only for authenticated sessions. We cleaned up the local `<nav>` blocks from all individual pages using script-based automated replacements.

4. **Handling Imperfect Data (Import Pipeline)**:
   Instead of hard failing the import script on bad rows, I built a pipeline that evaluates each row, flags anomalies, applies resolutions (like canonicalizing names, fixing currency rates), and imports the valid part of the row. Anomaly actions are categorized into `IMPORTED`, `SKIPPED`, `FLAGGED`, `CONVERTED`, `NORMALIZED`, and `ROUNDED`.

5. **Fixed Currency Exchange Rate (1 USD = 84 INR)**:
   To avoid failure due to third-party API limits or rate-limiting in production, we hardcoded a realistic exchange rate representing the context time (March 2026). This is documented and ensures the import script behaves predictably during the live review.

6. **Meera's "Approve Deletions" Rule**:
   I implemented a soft-delete (`isDeleted = true`) mechanism instead of hard SQL `DELETE`. When an expense is removed by a user other than Meera, a `DeletionRequest` is created. Since Meera has absolute authority, if the logged-in user is Meera, the deletion request is automatically bypass-approved.

7. **Flexible Split Types**:
   - `EQUAL`: Simple division.
   - `PERCENTAGE`: Calculated dynamically. If percentages don't sum to 100%, we calculate the relative percentage logic or flag the anomaly.
   - `SHARE`: Calculates proportions (e.g., Aisha 1, Rohan 2). If total shares = 0, falls back to EQUAL.
   - `UNEQUAL`: Direct amounts. If they don't match the total, we flag it.

8. **Settlements vs Expenses**:
   Row 14 ("Rohan paid Aisha") is a settlement. I designed the schema with a `Settlement` table separate from the `Expense` table. This correctly credits Rohan and debits Aisha without adding a shared group expense.

9. **Database Connection Pooling**:
   For compatibility with Vercel's serverless functions, we configured connection pooling (`pgbouncer=true` on port `6543`) for `DATABASE_URL` to prevent running out of database connections. We preserved a direct, unpooled connection on port `5432` for `DIRECT_URL` to safely run Prisma migrations and schema push tasks.

# AI Usage Log

This project was built using an advanced AI coding assistant working in pair-programming mode. The AI acted as the primary developer, while I guided the architecture, provided domain context, and reviewed the decisions.

---

## 🛠️ AI Tools Used
* **Primary Model**: Google Gemini / Anthropic Claude (via an integrated agentic IDE)
* **Key Capabilities Utilized**:
  * Full-stack code scaffolding (Next.js 16, Prisma)
  * Data anomaly detection and CSV parser logic
  * Secure Authentication Integration (NextAuth.js v5)
  * Script-based automated refactoring (removing duplicate code/navs)
  * Database schema migrations and connection diagnostics

---

## 💡 Key Prompts & Architecture Guidance
To guide the AI effectively, I used high-level architectural prompts rather than micro-managing code:
1. *"I have a messy CSV export of shared expenses. Build an import pipeline that detects duplicates, invalid dates, unknown members, and conflicting split types without failing the entire import. Keep a log of every anomaly."*
2. *"Design a Prisma schema that separates `Expense` (shared costs) from `Settlement` (direct transfers) to properly handle cases like 'Rohan paid Aisha 5000'."*
3. *"Create a Next.js UI that shows net balances. Add a drill-down page where a user can click on Rohan's balance and see exactly which expenses and splits make up his total."*
4. *"Add a secure authentication module using NextAuth. Allow users to register and claim one of the imported CSV member profiles so they can manage their own data."*

---

## ⚠️ Key Challenges & How We Fixed Them

### 1. Prisma Version Compatibility Issue
* **The Mistake**: The AI initially scaffolded the project using Prisma v7 but generated a `schema.prisma` file using older syntax (`url = env("DATABASE_URL")`), causing the Next.js build to fail with validation errors because Prisma 7 changed the schema configuration format.
* **The Fix**: I instructed the AI to downgrade the Prisma dependencies (`prisma` and `@prisma/client`) to `^5.22.0` to ensure stability and compatibility with the generated schema.

### 2. Assuming Settlement Rows Were Zero-Amount Expenses
* **The Mistake**: When writing the CSV parsing pipeline, the AI initially tried to parse row 14 ("Rohan paid Aisha") as an expense with a missing `split_type`. It attempted to fall back to an EQUAL split, which incorrectly charged Priya and Meera for Rohan paying Aisha.
* **The Fix**: I identified the error and guided the AI to write a specific `isSettlement` heuristic function that detects keywords like "paid", checks for empty split types, and routes the row to the `Settlement` table instead of the `Expense` table.

### 3. Sub-Paisa Rounding Errors in Split Calculations
* **The Mistake**: When splitting ₹2,450 among 4 people equally, the AI's calculation (`amount / 4`) resulted in infinite decimal balances or floating-point precision errors (e.g., `612.500000000001`) which made the "total owed vs total paid" reconciliation fail by ₹0.01.
* **The Fix**: We enforced strict 2-decimal precision rounding (`Math.round(val * 100) / 100`) on all split calculations and added a warning when split totals differed from the actual expense amount.

### 4. NextAuth Middleware Redirect Loop
* **The Mistake**: After implementing `middleware.ts` to protect routes, NextAuth entered an infinite redirect loop when access to `/login` or `/register` was attempted, because the middleware was protecting *all* routes including the login page itself.
* **The Fix**: We updated the middleware configuration to explicitly exclude public routes (`/login`, `/register`, `/api/auth/*`, and static files) from the protection rules.

### 5. Outdated Database Hostname on Vercel
* **The Mistake**: During production deployment, Vercel builds failed because Prisma couldn't reach `db.smgfokfnukqwuzwmwgbz.supabase.co:5432`.
* **The Fix**: We diagnosed the connection using a custom Node test runner. The issue was that the Vercel dashboard was configured with Supabase's deprecated direct hostname. We updated Vercel's `DATABASE_URL` and `DIRECT_URL` environment variables to point to the new pooler endpoints (`aws-1-ap-south-1.pooler.supabase.com`) to fix the build pipeline.

# AI Usage Log

This project was built using an advanced AI coding assistant working in pair-programming mode. The AI acted as the primary developer, while I guided the architecture, provided domain context, and reviewed the decisions.

## AI Tools Used
- **Primary Model**: Google Gemini / Anthropic Claude (via an integrated agentic IDE)
- **Key Capabilities Utilized**:
  - Full-stack code scaffolding (Next.js, Prisma)
  - Data anomaly detection logic writing
  - UI/UX layout and CSS generation
  - Database schema design

## Key Prompts
To guide the AI effectively, I used high-level architectural prompts rather than micro-managing code:
1. *"I have a messy CSV export of shared expenses. Build an import pipeline that detects duplicates, invalid dates, unknown members, and conflicting split types without failing the entire import. Keep a log of every anomaly."*
2. *"Design a Prisma schema that separates `Expense` (shared costs) from `Settlement` (direct transfers) to properly handle cases like 'Rohan paid Aisha 5000'."*
3. *"Create a Next.js UI that shows net balances. Add a drill-down page where a user can click on Rohan's balance and see exactly which expenses and splits make up his total."*

## 3 Cases Where AI Produced Errors & How I Fixed Them

### 1. Prisma Version Compatibility Issue
**The Mistake:** The AI initially scaffolded the project using the latest Prisma version (v7) but generated a `schema.prisma` file using v5/v6 syntax (`url = env("DATABASE_URL")`), causing the Next.js build to fail with a validation error because Prisma 7 deprecated that schema format.
**The Fix:** I instructed the AI to downgrade the Prisma dependencies (`prisma` and `@prisma/client`) to `^5.10.0` to ensure stability and compatibility with the generated schema.

### 2. Assuming Settlement Rows Were Zero-Amount Expenses
**The Mistake:** When writing the CSV parsing pipeline, the AI initially tried to parse row 14 ("Rohan paid Aisha") as an expense with a missing `split_type`. It attempted to fall back to an EQUAL split, which incorrectly charged Priya and Meera for Rohan paying Aisha.
**The Fix:** I identified the error and guided the AI to write a specific `isSettlement` heuristic function that detects keywords like "paid", checks for empty split types, and routes the row to the `Settlement` table instead of the `Expense` table.

### 3. Sub-Paisa Rounding Errors in Split Calculations
**The Mistake:** When splitting ₹2450 among 4 people equally, the AI's naive calculation (`amount / 4`) resulted in infinite decimal balances or floating-point precision errors (e.g., `612.500000000001`) which made the "total owed vs total paid" reconciliation fail by ₹0.01.
**The Fix:** I prompted the AI to enforce strict 2-decimal precision rounding (`Math.round(val * 100) / 100`) on all split calculations and added a UI warning `⚠ Split sum differs from total` if the rounding resulted in a ₹1+ difference.

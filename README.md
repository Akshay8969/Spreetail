# FlatSplit — Shared Expenses App

FlatSplit is a full-stack Next.js application built for the Spreetail "Shared Expenses App" internship hiring assignment. It allows members of "The Flat" to import messy historical expense CSVs, automatically normalize and resolve data anomalies, track net balances, drill down into detailed calculation sheets, settle up, and manage their profile using secure authentication.

---

## 🌟 Key Features

* **Authentication & Account Claiming**: Users can register with an email and password. During registration, they can "claim" an imported person profile (e.g., *Rohan*, *Aisha*, *Priya*, or *Meera*) to take ownership of their historical expense data.
* **Smart CSV Import Pipeline**: Parses messy CSVs, detects and resolves duplicates, auto-normalizes mismatched names and dates, converts foreign currencies (USD to INR), formats precise decimals, and imports direct settlement rows (e.g., *"Rohan paid Aisha 5000"*) directly into a separate settlements table.
* **Interactive Dashboard**:
  * **Net Balances**: Visual card layout showing who owes what at a glance.
  * **Drilldown Calculations**: Click on any member to see an exact step-by-step breakdown of how their balance was calculated.
  * **Expense Log**: List of all valid expenses.
  * **Settlement Log**: Direct payment tracking.
* **Expense Management**: Add new expenses with custom split configurations (Equal, Unequal, Percentage, Share).
* **Robust Settlement Flow**: Record settlement payments between members to keep the balance sheet updated.

---

## 🛠️ Technology Stack

* **Framework**: Next.js 16.2 (Turbopack)
* **ORM**: Prisma Client v5.22
* **Database**: PostgreSQL (Supabase)
* **Authentication**: NextAuth.js v5 (Auth.js Beta)
* **Styling**: Vanilla CSS (Premium responsive design system with HSL colors, glassmorphism, and smooth transitions)

---

## 🚀 Setup Instructions

### 1. Prerequisites
* Node.js 20+
* A PostgreSQL database (e.g., Supabase free tier)
* GitHub account (to push code to)
* Vercel account (for deployment)

### 2. Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Akshay8969/Spreetail.git
   cd spreetail-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the project:
   ```env
   # Database Connections
   DATABASE_URL="postgresql://postgres.[YOUR-REF]:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[YOUR-REF]:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

   # Auth Secret (required for Auth.js cookie encryption)
   AUTH_SECRET="your_random_secure_secret_key"
   ```

4. **Initialize the Database**:
   Push the Prisma schema to your database:
   ```bash
   npx prisma generate
   npx prisma db push --accept-data-loss
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💻 Usage & Verification Flow

1. **Initial Registration**:
   * Navigate to `http://localhost:3000`. You will be redirected to the `/login` page.
   * Click **"Register"** to create a new account.
   * Select an imported name (e.g., *Rohan*) to claim their historical records.
2. **Importing the CSV**:
   * Go to **"Import CSV"** in the navigation bar.
   * Upload the provided `expenses_export.csv`.
   * Review the comprehensive **Import Report**, which details valid items imported, invalid items skipped, and anomalies flagged for review.
3. **Tracking Balances & Settling Up**:
   * Go to the **Dashboard** to view the net balances.
   * Click on any user's name to view a detailed calculation spreadsheet breakdown.
   * Record new expenses using the **"Add Expense"** form, or settle up using the **"Record Settlement"** form.

---

## 🌐 Deploying to Vercel

1. Push your code changes to GitHub.
2. Link your repository in **Vercel**.
3. In the project settings, add the environment variables:
   * `DATABASE_URL` (using the pooling URL)
   * `DIRECT_URL` (using the direct session URL)
   * `AUTH_SECRET` (generate a unique secure key)
4. Redeploy the project.

---

## 📄 AI Collaboration

This project was built in collaboration with an AI coding assistant. Refer to [AI_USAGE.md](file:///c:/Users/Akshay%20Singh/Desktop/Spreetail/spreetail-app/AI_USAGE.md) for full details on the development process, prompt strategies, and error-correction histories.

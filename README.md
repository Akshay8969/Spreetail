# Spreetail Shared Expenses App

This is a full-stack Next.js application built for the Spreetail "Shared Expenses App" internship assignment.

## Setup Instructions

This app is built with **Next.js 14 (App Router)** and **Prisma ORM** with **PostgreSQL**.

### 1. Prerequisites
- Node.js 20+
- A PostgreSQL database (e.g., Supabase free tier)
- GitHub account (to push the code to)
- Vercel account (for deployment)

### 2. Local Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <your-repo-url>
   cd spreetail-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the project:
   ```env
   # Connect to Supabase via connection pooling with Supavisor.
   DATABASE_URL="postgres://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   
   # Direct connection to the database. Used for migrations.
   DIRECT_URL="postgres://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
   ```

4. **Initialize the Database**:
   Push the Prisma schema to your Supabase PostgreSQL database:
   ```bash
   npx prisma db push
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Usage & Testing

1. On the home page, click **"Import CSV"**.
2. Upload the provided `expenses_export.csv`.
3. The app will process the CSV, flag anomalies, skip invalid rows, and import valid data.
4. A comprehensive import report will be displayed.
5. Go back to the dashboard to see the net balances, all expenses, and settlements.
6. Click on any user's balance to see a full step-by-step breakdown of how their balance was calculated.

### 4. Deployment to Vercel

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com/) and create a new project.
3. Import your GitHub repository.
4. In the Environment Variables section, add your `DATABASE_URL` and `DIRECT_URL`.
5. Click **Deploy**.

## AI Usage

This project was built in collaboration with an AI coding assistant. Please refer to `AI_USAGE.md` for full details on prompts, tools, and error corrections.

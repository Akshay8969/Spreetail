import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/expenses — returns all non-deleted expenses + settlements + balances
export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      where: { isDeleted: false },
      orderBy: { date: "asc" },
      include: {
        paidBy: true,
        splits: { include: { person: true } },
        anomalies: true,
      },
    });

    const settlements = await prisma.settlement.findMany({
      orderBy: { date: "asc" },
      include: { paidBy: true, paidTo: true },
    });

    // Compute net balances: paid - owed
    const balances: Record<string, number> = {};

    for (const exp of expenses) {
      const payer = exp.paidBy.name;
      // Payer gets credit for paying
      balances[payer] = (balances[payer] || 0) + exp.amountInr;
      // Each split participant owes their share
      for (const split of exp.splits) {
        const ower = split.person.name;
        balances[ower] = (balances[ower] || 0) - split.shareAmountInr;
      }
    }

    // Settlements adjust balances
    for (const s of settlements) {
      const from = s.paidBy.name;
      const to = s.paidTo.name;
      balances[from] = (balances[from] || 0) - s.amountInr;
      balances[to] = (balances[to] || 0) + s.amountInr;
    }

    // Attach isFlagged based on anomalies
    const enrichedExpenses = expenses.map((e) => ({
      ...e,
      isFlagged: e.anomalies.some((a) => a.actionTaken === "FLAGGED"),
    }));

    return NextResponse.json({ expenses: enrichedExpenses, settlements, balances });
  } catch (err) {
    console.error("Expenses fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch expenses", detail: String(err) },
      { status: 500 }
    );
  }
}

// POST /api/expenses — create a new expense manually
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { description, paidByName, amountOriginal, currency, splitType, date, notes, splits } = body;

    // Upsert person
    const paidBy = await prisma.person.upsert({
      where: { name: paidByName },
      create: { name: paidByName, displayName: paidByName },
      update: {},
    });

    const rate: Record<string, number> = { INR: 1, USD: 84, EUR: 91, GBP: 107 };
    const amountInr = amountOriginal * (rate[currency?.toUpperCase() || "INR"] || 1);

    // Upsert all split people
    const splitRecords: { personId: string; shareAmountInr: number; shareOriginal: string }[] = [];
    for (const s of (splits || [])) {
      const person = await prisma.person.upsert({
        where: { name: s.name },
        create: { name: s.name, displayName: s.name },
        update: {},
      });
      splitRecords.push({
        personId: person.id,
        shareAmountInr: s.shareAmountInr,
        shareOriginal: s.shareOriginal || "",
      });
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        paidById: paidBy.id,
        amountOriginal,
        currencyOriginal: currency?.toUpperCase() || "INR",
        amountInr,
        splitType: splitType || "EQUAL",
        date: new Date(date),
        notes: notes || null,
        splits: { create: splitRecords },
      },
      include: { paidBy: true, splits: { include: { person: true } } },
    });

    return NextResponse.json({ success: true, expense });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

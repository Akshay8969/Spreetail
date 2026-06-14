import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const personName = decodeURIComponent(name);

  try {
    const person = await prisma.person.findUnique({ where: { name: personName } });
    if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });

    // Get all expenses this person is involved in (either paid or in splits)
    const allExpenses = await prisma.expense.findMany({
      where: {
        isDeleted: false,
        OR: [
          { paidById: person.id },
          { splits: { some: { personId: person.id } } },
        ],
      },
      orderBy: { date: "asc" },
      include: {
        paidBy: true,
        splits: { include: { person: true } },
      },
    });

    const settlements = await prisma.settlement.findMany({
      where: {
        OR: [{ paidById: person.id }, { paidToId: person.id }],
      },
      orderBy: { date: "asc" },
      include: { paidBy: true, paidTo: true },
    });

    let totalPaid = 0;
    let totalOwed = 0;
    const expenseBreakdown = [];

    for (const exp of allExpenses) {
      const youPaid = exp.paidById === person.id;
      const yourSplit = exp.splits.find((s) => s.personId === person.id);
      const yourShare = yourSplit?.shareAmountInr ?? 0;

      if (youPaid) totalPaid += exp.amountInr;
      totalOwed += yourShare;

      expenseBreakdown.push({
        expenseId: exp.id,
        description: exp.description,
        date: exp.date.toISOString(),
        paidBy: exp.paidBy.name,
        amountInr: exp.amountInr,
        yourShare,
        youPaid,
      });
    }

    // Settlement adjustments
    const settlementItems = settlements.map((s) => ({
      date: s.date.toISOString(),
      direction: s.paidById === person.id ? "paid" as const : "received" as const,
      otherPerson: s.paidById === person.id ? s.paidTo.name : s.paidBy.name,
      amount: s.amountInr,
    }));

    // Net balance: what you paid - what you owe (+ settlements)
    let settlementNet = 0;
    for (const s of settlements) {
      if (s.paidById === person.id) settlementNet -= s.amountInr; // you paid someone
      else settlementNet += s.amountInr;                           // you received
    }

    const netBalance = totalPaid - totalOwed + settlementNet;

    return NextResponse.json({
      name: person.name,
      avatarColor: person.avatarColor,
      netBalance,
      totalPaid,
      totalOwed,
      expenseBreakdown,
      settlements: settlementItems,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/settle — record a payment between two people
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fromName, toName, amountInr, date, notes } = body;

    if (!fromName || !toName || !amountInr) {
      return NextResponse.json({ error: "fromName, toName, amountInr are required" }, { status: 400 });
    }

    const from = await prisma.person.upsert({
      where: { name: fromName },
      create: { name: fromName, displayName: fromName },
      update: {},
    });

    const to = await prisma.person.upsert({
      where: { name: toName },
      create: { name: toName, displayName: toName },
      update: {},
    });

    const settlement = await prisma.settlement.create({
      data: {
        paidById: from.id,
        paidToId: to.id,
        amountInr: parseFloat(amountInr),
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
      },
      include: { paidBy: true, paidTo: true },
    });

    return NextResponse.json({ success: true, settlement });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/settle — list people for dropdown
export async function GET() {
  const people = await prisma.person.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(people);
}

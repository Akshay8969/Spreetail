import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        paidBy: true,
        splits: { include: { person: true } },
        anomalies: true,
      },
    });
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(expense);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { requestedBy, reason } = body;

  try {
    // Check if Meera is requesting — if so, allow direct delete
    // Otherwise, create a deletion request for Meera to approve
    const meera = await prisma.person.findUnique({ where: { name: "Meera" } });
    const requester = requestedBy
      ? await prisma.person.findFirst({ where: { name: requestedBy } })
      : null;

    if (!requester) {
      // Direct soft-delete if no requester provided
      await prisma.expense.update({ where: { id }, data: { isDeleted: true } });
      return NextResponse.json({ success: true, status: "DELETED" });
    }

    if (requester.name === "Meera") {
      // Meera deletes directly
      await prisma.expense.update({ where: { id }, data: { isDeleted: true } });
      return NextResponse.json({ success: true, status: "DELETED" });
    }

    // Create deletion request for Meera to approve
    const existing = await prisma.deletionRequest.findUnique({ where: { expenseId: id } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Deletion request already pending" }, { status: 409 });
    }

    await prisma.deletionRequest.create({
      data: {
        expenseId: id,
        requestedById: requester.id,
        approverId: meera?.id,
        reason: reason || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, status: "PENDING_APPROVAL", message: "Deletion request sent to Meera for approval" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

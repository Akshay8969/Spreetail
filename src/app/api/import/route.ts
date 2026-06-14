import { NextRequest, NextResponse } from "next/server";
import { runImportPipeline, ProcessedExpense, ProcessedSettlement } from "@/lib/importPipeline";
import { prisma } from "@/lib/db";

// Ensure a Person record exists for a given name
async function ensurePerson(name: string): Promise<string> {
  const colors: Record<string, string> = {
    Aisha: "#8b5cf6",
    Rohan: "#06b6d4",
    Priya: "#f59e0b",
    Meera: "#10b981",
    Dev: "#f43f5e",
    Sam: "#6366f1",
  };

  const existing = await prisma.person.findUnique({ where: { name } });
  if (existing) return existing.id;

  const created = await prisma.person.create({
    data: {
      name,
      displayName: name,
      avatarColor: colors[name] || "#94a3b8",
    },
  });
  return created.id;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const csvText = await file.text();
    const pipelineResult = runImportPipeline(csvText);

    // Create import session
    const session = await prisma.importSession.create({
      data: {
        filename: file.name,
        totalRows: pipelineResult.totalRows,
        importedCount: pipelineResult.importedCount,
        skippedCount: pipelineResult.skippedCount,
        flaggedCount: pipelineResult.flaggedCount,
      },
    });

    // Upsert all persons
    const allNames = new Set<string>();
    for (const exp of pipelineResult.expenses) {
      allNames.add(exp.paidBy);
      for (const split of exp.splits) allNames.add(split.name);
    }
    for (const s of pipelineResult.settlements) {
      allNames.add(s.paidBy);
      allNames.add(s.paidTo);
    }

    const personIdMap: Record<string, string> = {};
    for (const name of allNames) {
      personIdMap[name] = await ensurePerson(name);
    }

    // Insert expenses
    const expenseIdMap: Record<number, string> = {};
    for (const exp of pipelineResult.expenses) {
      const paidById = personIdMap[exp.paidBy];
      if (!paidById) continue;

      const created = await prisma.expense.create({
        data: {
          description: exp.description,
          paidById,
          amountOriginal: exp.amountOriginal,
          currencyOriginal: exp.currencyOriginal,
          amountInr: exp.amountInr,
          splitType: exp.splitType,
          date: exp.date,
          notes: exp.notes || null,
          importRowNumber: exp.rowNumber,
          importSessionId: session.id,
          splits: {
            create: exp.splits
              .filter((s) => personIdMap[s.name])
              .map((s) => ({
                personId: personIdMap[s.name],
                shareAmountInr: s.shareAmountInr,
                shareOriginal: s.shareOriginal,
              })),
          },
        },
      });
      expenseIdMap[exp.rowNumber] = created.id;
    }

    // Insert settlements
    for (const s of pipelineResult.settlements) {
      const paidById = personIdMap[s.paidBy];
      const paidToId = personIdMap[s.paidTo];
      if (!paidById || !paidToId) continue;

      await prisma.settlement.create({
        data: {
          paidById,
          paidToId,
          amountInr: s.amountInr,
          date: s.date,
          notes: s.notes || null,
          importRowNumber: s.rowNumber,
          importSessionId: session.id,
        },
      });
    }

    // Insert anomalies
    for (const anomaly of pipelineResult.anomalies) {
      const expenseId = expenseIdMap[anomaly.rowNumber] || null;
      await prisma.importAnomaly.create({
        data: {
          sessionId: session.id,
          expenseId,
          rowNumber: anomaly.rowNumber,
          rawRow: JSON.stringify(anomaly.rawRow),
          anomalyType: anomaly.anomalyType,
          anomalyDescription: anomaly.anomalyDescription,
          actionTaken: anomaly.actionTaken,
          resolutionNotes: anomaly.resolutionNotes,
        },
      });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        totalRows: pipelineResult.totalRows,
        importedCount: pipelineResult.importedCount,
        skippedCount: pipelineResult.skippedCount,
        flaggedCount: pipelineResult.flaggedCount,
      },
      anomalies: pipelineResult.anomalies,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: "Import failed", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const sessions = await prisma.importSession.findMany({
    orderBy: { importedAt: "desc" },
    take: 10,
    include: {
      anomalies: { orderBy: { rowNumber: "asc" } },
    },
  });
  return NextResponse.json(sessions);
}

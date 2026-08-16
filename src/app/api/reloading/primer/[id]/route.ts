import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";
import { costPerThousand } from "@/lib/reloading/costs";

function withCalculated<T extends { purchasePrice: number | null; quantityOnHand: number }>(row: T) {
  return { ...row, costPerThousand: costPerThousand(row.purchasePrice, row.quantityOnHand) };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const primer = await prisma.primerInventory.findUnique({
      where: { id },
      include: { transactions: { orderBy: { transactedAt: "desc" } } },
    });
    if (!primer) return NextResponse.json({ error: "Primer inventory entry not found" }, { status: 404 });
    return NextResponse.json(withCalculated(primer));
  } catch (error) {
    console.error("GET /api/reloading/primer/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch primer inventory entry" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.primerInventory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Primer inventory entry not found" }, { status: 404 });

    const fields = [
      "manufacturer", "productName", "primerType", "isMagnum", "isMatch", "primerSystem",
      "sensitivityRating", "numberOfBoxes", "numberOfSleeves", "numberOfBricks", "countPerContainer",
      "lotNumber", "storageLocation", "condition", "purchasePrice", "hazmatFeePaid", "vendor",
      "intendedCalibersOrApplications", "compatiblePowderTypes", "seatingDepthNotes",
      "loadDataReference", "notes", "maxStorageQuantityCount", "hazardClassification", "reorderThreshold",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of fields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.dateAcquired !== undefined) {
      data.dateAcquired = body.dateAcquired ? new Date(body.dateAcquired) : null;
    }

    const updated = await prisma.primerInventory.update({
      where: { id },
      data,
      include: { transactions: { orderBy: { transactedAt: "desc" }, take: 10 } },
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(updated));
  } catch (error) {
    console.error("PUT /api/reloading/primer/[id] error:", error);
    return NextResponse.json({ error: "Failed to update primer inventory entry" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.primerInventory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Primer inventory entry not found" }, { status: 404 });

    const recipeLinkCount = await prisma.loadRecipe.count({ where: { primerId: id } });

    await prisma.primerInventory.delete({ where: { id } });
    revalidateDashboardData();
    return NextResponse.json({ success: true, id, recipeLinkCount });
  } catch (error) {
    console.error("DELETE /api/reloading/primer/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete primer inventory entry" }, { status: 500 });
  }
}

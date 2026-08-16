import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";
import { costPerCase } from "@/lib/reloading/costs";

function withCalculated<T extends { purchasePrice: number | null; quantityOnHand: number }>(row: T) {
  return { ...row, costPerCase: costPerCase(row.purchasePrice, row.quantityOnHand) };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const brass = await prisma.brassInventory.findUnique({
      where: { id },
      include: { transactions: { orderBy: { transactedAt: "desc" } } },
    });
    if (!brass) return NextResponse.json({ error: "Brass inventory entry not found" }, { status: 404 });
    return NextResponse.json(withCalculated(brass));
  } catch (error) {
    console.error("GET /api/reloading/brass/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch brass inventory entry" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.brassInventory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Brass inventory entry not found" }, { status: 404 });

    const fields = [
      "caliber", "headstamp", "manufacturer", "caseMaterial", "primerSystem", "caseOrigin",
      "isMilitaryBrass", "isMixedHeadstamp", "firingCount", "maxFiringCount", "preparationStatus",
      "isAnnealed", "annealingCount", "isNeckTurned", "isFlashHoleDeburred", "isPrimerPocketUniformed",
      "isPrimerPocketSwaged", "quantityOnHand", "quantityReadyToLoad", "quantityInProcess",
      "quantityRetired", "lotIdentifier", "storageLocation", "trimToLengthIn", "maxCaseLengthIn",
      "currentAvgLengthIn", "headDiameterIn", "neckWallThicknessIn", "dimensionalNotes",
      "purchasePrice", "vendor", "source", "intendedLoad", "compatibleDies", "loadDataReference", "notes",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of fields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.dateAcquired !== undefined) {
      data.dateAcquired = body.dateAcquired ? new Date(body.dateAcquired) : null;
    }

    const onHand = (data.quantityOnHand as number | undefined) ?? existing.quantityOnHand;
    const readyToLoad = (data.quantityReadyToLoad as number | undefined) ?? existing.quantityReadyToLoad;
    const inProcess = (data.quantityInProcess as number | undefined) ?? existing.quantityInProcess;
    if (readyToLoad + inProcess > onHand) {
      return NextResponse.json(
        { error: "quantityReadyToLoad + quantityInProcess cannot exceed quantityOnHand" },
        { status: 400 }
      );
    }

    const updated = await prisma.brassInventory.update({
      where: { id },
      data,
      include: { transactions: { orderBy: { transactedAt: "desc" }, take: 10 } },
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(updated));
  } catch (error) {
    console.error("PUT /api/reloading/brass/[id] error:", error);
    return NextResponse.json({ error: "Failed to update brass inventory entry" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.brassInventory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Brass inventory entry not found" }, { status: 404 });

    const recipeLinkCount = await prisma.loadRecipe.count({ where: { brassId: id } });

    await prisma.brassInventory.delete({ where: { id } });
    revalidateDashboardData();
    return NextResponse.json({ success: true, id, recipeLinkCount });
  } catch (error) {
    console.error("DELETE /api/reloading/brass/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete brass inventory entry" }, { status: 500 });
  }
}

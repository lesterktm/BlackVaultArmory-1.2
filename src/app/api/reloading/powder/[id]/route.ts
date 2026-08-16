import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";
import { costPerPound, quantityOnHandLbs } from "@/lib/reloading/costs";

function withCalculated<T extends { purchasePrice: number | null; quantityOnHandGrains: number }>(row: T) {
  return {
    ...row,
    costPerPound: costPerPound(row.purchasePrice, row.quantityOnHandGrains),
    quantityOnHandLbs: quantityOnHandLbs(row.quantityOnHandGrains),
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const powder = await prisma.powderInventory.findUnique({
      where: { id },
      include: { transactions: { orderBy: { transactedAt: "desc" } } },
    });
    if (!powder) return NextResponse.json({ error: "Powder inventory entry not found" }, { status: 404 });
    return NextResponse.json(withCalculated(powder));
  } catch (error) {
    console.error("GET /api/reloading/powder/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch powder inventory entry" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.powderInventory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Powder inventory entry not found" }, { status: 404 });

    const fields = [
      "manufacturer", "productName", "powderType", "burnRateCategory", "burnRateNumber",
      "granuleShape", "color", "numberOfContainers", "containerSizeLbs", "lotNumber",
      "storageLocation", "condition", "purchasePrice", "hazmatFeePaid", "vendor",
      "intendedCalibersOrApplications", "compatibleBulletWeightMin", "compatibleBulletWeightMax",
      "typicalChargeMin", "typicalChargeMax", "loadDataReference", "notes",
      "maxStorageQuantityLbs", "hazardClassification", "reorderThreshold",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of fields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.dateAcquired !== undefined) {
      data.dateAcquired = body.dateAcquired ? new Date(body.dateAcquired) : null;
    }

    const updated = await prisma.powderInventory.update({
      where: { id },
      data,
      include: { transactions: { orderBy: { transactedAt: "desc" }, take: 10 } },
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(updated));
  } catch (error) {
    console.error("PUT /api/reloading/powder/[id] error:", error);
    return NextResponse.json({ error: "Failed to update powder inventory entry" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.powderInventory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Powder inventory entry not found" }, { status: 404 });

    const recipeLinkCount = await prisma.loadRecipe.count({ where: { powderId: id } });

    await prisma.powderInventory.delete({ where: { id } });
    revalidateDashboardData();
    return NextResponse.json({ success: true, id, recipeLinkCount });
  } catch (error) {
    console.error("DELETE /api/reloading/powder/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete powder inventory entry" }, { status: 500 });
  }
}

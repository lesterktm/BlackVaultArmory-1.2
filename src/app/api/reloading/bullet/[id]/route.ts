import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";
import { costPerBullet, costPerHundred, sectionalDensity } from "@/lib/reloading/costs";

function withCalculated<
  T extends { purchasePrice: number | null; quantityOnHand: number; weightGrains: number; caliberDiameterIn: number }
>(row: T) {
  const perBullet = costPerBullet(row.purchasePrice, row.quantityOnHand);
  return {
    ...row,
    costPerBullet: perBullet,
    costPerHundred: costPerHundred(perBullet),
    sectionalDensity: sectionalDensity(row.weightGrains, row.caliberDiameterIn),
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bullet = await prisma.bulletInventory.findUnique({
      where: { id },
      include: { transactions: { orderBy: { transactedAt: "desc" } } },
    });
    if (!bullet) return NextResponse.json({ error: "Bullet inventory entry not found" }, { status: 404 });
    return NextResponse.json(withCalculated(bullet));
  } catch (error) {
    console.error("GET /api/reloading/bullet/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch bullet inventory entry" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.bulletInventory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Bullet inventory entry not found" }, { status: 404 });

    if (body.bcG1 != null && (body.bcG1 < 0.05 || body.bcG1 > 1.2)) {
      return NextResponse.json({ error: "bcG1 must be between 0.050 and 1.200" }, { status: 400 });
    }
    if (body.bcG7 != null && (body.bcG7 < 0.05 || body.bcG7 > 1.2)) {
      return NextResponse.json({ error: "bcG7 must be between 0.050 and 1.200" }, { status: 400 });
    }

    const fields = [
      "manufacturer", "productLine", "productName", "caliberDiameterIn", "caliberLabel", "weightGrains",
      "bulletType", "baseStyle", "noseStyle", "intendedUse", "coreConstruction", "jacketMaterial",
      "isLeadFree", "hasCannelure", "hasBoattailGasCheck", "bcG1", "bcG7", "bulletLengthIn",
      "baseToOgiveIn", "twistRateMin", "twistRateRecommended", "numberOfBoxes", "countPerBox",
      "lotNumber", "storageLocation", "condition", "purchasePrice", "vendor",
      "intendedCalibersOrCartridges", "recommendedCoalIn", "recommendedHundredthsJump",
      "compatiblePowders", "loadDataReference", "notes", "reorderThreshold",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of fields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.dateAcquired !== undefined) {
      data.dateAcquired = body.dateAcquired ? new Date(body.dateAcquired) : null;
    }

    const updated = await prisma.bulletInventory.update({
      where: { id },
      data,
      include: { transactions: { orderBy: { transactedAt: "desc" }, take: 10 } },
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(updated));
  } catch (error) {
    console.error("PUT /api/reloading/bullet/[id] error:", error);
    return NextResponse.json({ error: "Failed to update bullet inventory entry" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.bulletInventory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Bullet inventory entry not found" }, { status: 404 });

    const recipeLinkCount = await prisma.loadRecipe.count({ where: { bulletId: id } });

    await prisma.bulletInventory.delete({ where: { id } });
    revalidateDashboardData();
    return NextResponse.json({ success: true, id, recipeLinkCount });
  } catch (error) {
    console.error("DELETE /api/reloading/bullet/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete bullet inventory entry" }, { status: 500 });
  }
}

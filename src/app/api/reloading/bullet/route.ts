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

// GET /api/reloading/bullet - List all BulletInventory entries
export async function GET() {
  try {
    const bullets = await prisma.bulletInventory.findMany({
      include: { _count: { select: { transactions: true } } },
      orderBy: [{ manufacturer: "asc" }, { productName: "asc" }],
    });
    return NextResponse.json({ bullets: bullets.map(withCalculated) });
  } catch (error) {
    console.error("GET /api/reloading/bullet error:", error);
    return NextResponse.json({ error: "Failed to fetch bullet inventory" }, { status: 500 });
  }
}

// POST /api/reloading/bullet - Create a new BulletInventory entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      manufacturer, productLine, productName, caliberDiameterIn, caliberLabel, weightGrains,
      bulletType, baseStyle, noseStyle, intendedUse, coreConstruction, jacketMaterial,
      isLeadFree, hasCannelure, hasBoattailGasCheck, bcG1, bcG7, bulletLengthIn, baseToOgiveIn,
      twistRateMin, twistRateRecommended, quantityOnHand, numberOfBoxes, countPerBox, lotNumber,
      dateAcquired, storageLocation, condition, purchasePrice, vendor, intendedCalibersOrCartridges,
      recommendedCoalIn, recommendedHundredthsJump, compatiblePowders, loadDataReference, notes,
      reorderThreshold,
    } = body;

    if (!manufacturer || !productName || !bulletType || caliberDiameterIn == null || weightGrains == null) {
      return NextResponse.json(
        { error: "Missing required fields: manufacturer, productName, bulletType, caliberDiameterIn, weightGrains" },
        { status: 400 }
      );
    }
    if (bcG1 != null && (bcG1 < 0.05 || bcG1 > 1.2)) {
      return NextResponse.json({ error: "bcG1 must be between 0.050 and 1.200" }, { status: 400 });
    }
    if (bcG7 != null && (bcG7 < 0.05 || bcG7 > 1.2)) {
      return NextResponse.json({ error: "bcG7 must be between 0.050 and 1.200" }, { status: 400 });
    }
    if (baseToOgiveIn != null && bulletLengthIn != null && baseToOgiveIn >= bulletLengthIn) {
      return NextResponse.json({ error: "baseToOgiveIn must be less than bulletLengthIn" }, { status: 400 });
    }

    const bullet = await prisma.bulletInventory.create({
      data: {
        manufacturer,
        productLine: productLine ?? null,
        productName,
        caliberDiameterIn,
        caliberLabel: caliberLabel ?? null,
        weightGrains,
        bulletType,
        baseStyle: baseStyle ?? null,
        noseStyle: noseStyle ?? null,
        intendedUse: intendedUse ?? null,
        coreConstruction: coreConstruction ?? null,
        jacketMaterial: jacketMaterial ?? null,
        isLeadFree: isLeadFree ?? false,
        hasCannelure: hasCannelure ?? false,
        hasBoattailGasCheck: hasBoattailGasCheck ?? false,
        bcG1: bcG1 ?? null,
        bcG7: bcG7 ?? null,
        bulletLengthIn: bulletLengthIn ?? null,
        baseToOgiveIn: baseToOgiveIn ?? null,
        twistRateMin: twistRateMin ?? null,
        twistRateRecommended: twistRateRecommended ?? null,
        quantityOnHand: quantityOnHand ?? 0,
        numberOfBoxes: numberOfBoxes ?? null,
        countPerBox: countPerBox ?? null,
        lotNumber: lotNumber ?? null,
        dateAcquired: dateAcquired ? new Date(dateAcquired) : null,
        storageLocation: storageLocation ?? null,
        condition: condition ?? null,
        purchasePrice: purchasePrice ?? null,
        vendor: vendor ?? null,
        intendedCalibersOrCartridges: intendedCalibersOrCartridges ?? null,
        recommendedCoalIn: recommendedCoalIn ?? null,
        recommendedHundredthsJump: recommendedHundredthsJump ?? null,
        compatiblePowders: compatiblePowders ?? null,
        loadDataReference: loadDataReference ?? null,
        notes: notes ?? null,
        reorderThreshold: reorderThreshold ?? null,
      },
      include: { _count: { select: { transactions: true } } },
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(bullet), { status: 201 });
  } catch (error) {
    console.error("POST /api/reloading/bullet error:", error);
    return NextResponse.json({ error: "Failed to create bullet inventory entry" }, { status: 500 });
  }
}

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

// GET /api/reloading/powder - List all PowderInventory entries
export async function GET() {
  try {
    const powders = await prisma.powderInventory.findMany({
      include: { _count: { select: { transactions: true } } },
      orderBy: [{ manufacturer: "asc" }, { productName: "asc" }],
    });

    return NextResponse.json({ powders: powders.map(withCalculated) });
  } catch (error) {
    console.error("GET /api/reloading/powder error:", error);
    return NextResponse.json({ error: "Failed to fetch powder inventory" }, { status: 500 });
  }
}

// POST /api/reloading/powder - Create a new PowderInventory entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      manufacturer,
      productName,
      powderType,
      burnRateCategory,
      burnRateNumber,
      granuleShape,
      color,
      quantityOnHandGrains,
      numberOfContainers,
      containerSizeLbs,
      lotNumber,
      dateAcquired,
      storageLocation,
      condition,
      purchasePrice,
      hazmatFeePaid,
      vendor,
      intendedCalibersOrApplications,
      compatibleBulletWeightMin,
      compatibleBulletWeightMax,
      typicalChargeMin,
      typicalChargeMax,
      loadDataReference,
      notes,
      maxStorageQuantityLbs,
      hazardClassification,
      reorderThreshold,
    } = body;

    if (!manufacturer || !productName || !powderType) {
      return NextResponse.json(
        { error: "Missing required fields: manufacturer, productName, powderType" },
        { status: 400 }
      );
    }
    if (typicalChargeMin != null && typicalChargeMax != null && typicalChargeMin > typicalChargeMax) {
      return NextResponse.json({ error: "typicalChargeMin must be <= typicalChargeMax" }, { status: 400 });
    }

    const powder = await prisma.powderInventory.create({
      data: {
        manufacturer,
        productName,
        powderType,
        burnRateCategory: burnRateCategory ?? null,
        burnRateNumber: burnRateNumber ?? null,
        granuleShape: granuleShape ?? null,
        color: color ?? null,
        quantityOnHandGrains: quantityOnHandGrains ?? 0,
        numberOfContainers: numberOfContainers ?? null,
        containerSizeLbs: containerSizeLbs ?? null,
        lotNumber: lotNumber ?? null,
        dateAcquired: dateAcquired ? new Date(dateAcquired) : null,
        storageLocation: storageLocation ?? null,
        condition: condition ?? null,
        purchasePrice: purchasePrice ?? null,
        hazmatFeePaid: hazmatFeePaid ?? false,
        vendor: vendor ?? null,
        intendedCalibersOrApplications: intendedCalibersOrApplications ?? null,
        compatibleBulletWeightMin: compatibleBulletWeightMin ?? null,
        compatibleBulletWeightMax: compatibleBulletWeightMax ?? null,
        typicalChargeMin: typicalChargeMin ?? null,
        typicalChargeMax: typicalChargeMax ?? null,
        loadDataReference: loadDataReference ?? null,
        notes: notes ?? null,
        maxStorageQuantityLbs: maxStorageQuantityLbs ?? null,
        hazardClassification: hazardClassification ?? null,
        reorderThreshold: reorderThreshold ?? null,
      },
      include: { _count: { select: { transactions: true } } },
    });

    revalidateDashboardData();

    return NextResponse.json(withCalculated(powder), { status: 201 });
  } catch (error) {
    console.error("POST /api/reloading/powder error:", error);
    return NextResponse.json({ error: "Failed to create powder inventory entry" }, { status: 500 });
  }
}

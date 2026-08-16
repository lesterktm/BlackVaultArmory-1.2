import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";
import { costPerThousand } from "@/lib/reloading/costs";

function withCalculated<T extends { purchasePrice: number | null; quantityOnHand: number }>(row: T) {
  return { ...row, costPerThousand: costPerThousand(row.purchasePrice, row.quantityOnHand) };
}

// GET /api/reloading/primer - List all PrimerInventory entries
export async function GET() {
  try {
    const primers = await prisma.primerInventory.findMany({
      include: { _count: { select: { transactions: true } } },
      orderBy: [{ manufacturer: "asc" }, { productName: "asc" }],
    });
    return NextResponse.json({ primers: primers.map(withCalculated) });
  } catch (error) {
    console.error("GET /api/reloading/primer error:", error);
    return NextResponse.json({ error: "Failed to fetch primer inventory" }, { status: 500 });
  }
}

// POST /api/reloading/primer - Create a new PrimerInventory entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      manufacturer, productName, primerType, isMagnum, isMatch, primerSystem, sensitivityRating,
      quantityOnHand, numberOfBoxes, numberOfSleeves, numberOfBricks, countPerContainer,
      lotNumber, dateAcquired, storageLocation, condition, purchasePrice, hazmatFeePaid, vendor,
      intendedCalibersOrApplications, compatiblePowderTypes, seatingDepthNotes, loadDataReference,
      notes, maxStorageQuantityCount, hazardClassification, reorderThreshold,
    } = body;

    if (!manufacturer || !productName || !primerType) {
      return NextResponse.json({ error: "Missing required fields: manufacturer, productName, primerType" }, { status: 400 });
    }

    const primer = await prisma.primerInventory.create({
      data: {
        manufacturer,
        productName,
        primerType,
        isMagnum: isMagnum ?? false,
        isMatch: isMatch ?? false,
        primerSystem: primerSystem ?? "Boxer",
        sensitivityRating: sensitivityRating ?? null,
        quantityOnHand: quantityOnHand ?? 0,
        numberOfBoxes: numberOfBoxes ?? null,
        numberOfSleeves: numberOfSleeves ?? null,
        numberOfBricks: numberOfBricks ?? null,
        countPerContainer: countPerContainer ?? null,
        lotNumber: lotNumber ?? null,
        dateAcquired: dateAcquired ? new Date(dateAcquired) : null,
        storageLocation: storageLocation ?? null,
        condition: condition ?? null,
        purchasePrice: purchasePrice ?? null,
        hazmatFeePaid: hazmatFeePaid ?? false,
        vendor: vendor ?? null,
        intendedCalibersOrApplications: intendedCalibersOrApplications ?? null,
        compatiblePowderTypes: compatiblePowderTypes ?? null,
        seatingDepthNotes: seatingDepthNotes ?? null,
        loadDataReference: loadDataReference ?? null,
        notes: notes ?? null,
        maxStorageQuantityCount: maxStorageQuantityCount ?? null,
        hazardClassification: hazardClassification ?? null,
        reorderThreshold: reorderThreshold ?? null,
      },
      include: { _count: { select: { transactions: true } } },
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(primer), { status: 201 });
  } catch (error) {
    console.error("POST /api/reloading/primer error:", error);
    return NextResponse.json({ error: "Failed to create primer inventory entry" }, { status: 500 });
  }
}

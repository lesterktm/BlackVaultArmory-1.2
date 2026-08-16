import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";
import { costPerCase } from "@/lib/reloading/costs";

function withCalculated<T extends { purchasePrice: number | null; quantityOnHand: number }>(row: T) {
  return { ...row, costPerCase: costPerCase(row.purchasePrice, row.quantityOnHand) };
}

// GET /api/reloading/brass - List all BrassInventory entries
export async function GET() {
  try {
    const brassLots = await prisma.brassInventory.findMany({
      include: { _count: { select: { transactions: true } } },
      orderBy: [{ caliber: "asc" }, { manufacturer: "asc" }],
    });
    return NextResponse.json({ brass: brassLots.map(withCalculated) });
  } catch (error) {
    console.error("GET /api/reloading/brass error:", error);
    return NextResponse.json({ error: "Failed to fetch brass inventory" }, { status: 500 });
  }
}

// POST /api/reloading/brass - Create a new BrassInventory entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      caliber, headstamp, manufacturer, caseMaterial, primerSystem, caseOrigin,
      isMilitaryBrass, isMixedHeadstamp, firingCount, maxFiringCount, preparationStatus,
      isAnnealed, annealingCount, isNeckTurned, isFlashHoleDeburred, isPrimerPocketUniformed,
      isPrimerPocketSwaged, quantityOnHand, quantityReadyToLoad, quantityInProcess,
      quantityRetired, lotIdentifier, dateAcquired, storageLocation, trimToLengthIn,
      maxCaseLengthIn, currentAvgLengthIn, headDiameterIn, neckWallThicknessIn,
      dimensionalNotes, purchasePrice, vendor, source, intendedLoad, compatibleDies,
      loadDataReference, notes,
    } = body;

    if (!caliber) {
      return NextResponse.json({ error: "Missing required field: caliber" }, { status: 400 });
    }

    const onHand = quantityOnHand ?? 0;
    const readyToLoad = quantityReadyToLoad ?? 0;
    const inProcess = quantityInProcess ?? 0;
    if (readyToLoad + inProcess > onHand) {
      return NextResponse.json(
        { error: "quantityReadyToLoad + quantityInProcess cannot exceed quantityOnHand" },
        { status: 400 }
      );
    }

    const brass = await prisma.brassInventory.create({
      data: {
        caliber,
        headstamp: headstamp ?? null,
        manufacturer: manufacturer ?? null,
        caseMaterial: caseMaterial ?? "Brass",
        primerSystem: primerSystem ?? "Boxer",
        caseOrigin: caseOrigin ?? null,
        isMilitaryBrass: isMilitaryBrass ?? false,
        isMixedHeadstamp: isMixedHeadstamp ?? false,
        firingCount: firingCount ?? 0,
        maxFiringCount: maxFiringCount ?? null,
        preparationStatus: preparationStatus ?? null,
        isAnnealed: isAnnealed ?? false,
        annealingCount: annealingCount ?? 0,
        isNeckTurned: isNeckTurned ?? false,
        isFlashHoleDeburred: isFlashHoleDeburred ?? false,
        isPrimerPocketUniformed: isPrimerPocketUniformed ?? false,
        isPrimerPocketSwaged: isPrimerPocketSwaged ?? false,
        quantityOnHand: onHand,
        quantityReadyToLoad: readyToLoad,
        quantityInProcess: inProcess,
        quantityRetired: quantityRetired ?? 0,
        lotIdentifier: lotIdentifier ?? null,
        dateAcquired: dateAcquired ? new Date(dateAcquired) : null,
        storageLocation: storageLocation ?? null,
        trimToLengthIn: trimToLengthIn ?? null,
        maxCaseLengthIn: maxCaseLengthIn ?? null,
        currentAvgLengthIn: currentAvgLengthIn ?? null,
        headDiameterIn: headDiameterIn ?? null,
        neckWallThicknessIn: neckWallThicknessIn ?? null,
        dimensionalNotes: dimensionalNotes ?? null,
        purchasePrice: purchasePrice ?? null,
        vendor: vendor ?? null,
        source: source ?? null,
        intendedLoad: intendedLoad ?? null,
        compatibleDies: compatibleDies ?? null,
        loadDataReference: loadDataReference ?? null,
        notes: notes ?? null,
      },
      include: { _count: { select: { transactions: true } } },
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(brass), { status: 201 });
  } catch (error) {
    console.error("POST /api/reloading/brass error:", error);
    return NextResponse.json({ error: "Failed to create brass inventory entry" }, { status: 500 });
  }
}

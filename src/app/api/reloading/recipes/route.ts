import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";
import { isAtOrNearMaxCharge } from "@/lib/reloading/costs";

const RECIPE_INCLUDE = {
  bullet: true,
  powder: true,
  primer: true,
  brass: true,
  _count: { select: { batches: true, chronographSessions: true } },
} as const;

function withCalculated<T extends { chargeWeightGrains: number; publishedChargeMaxGrains: number | null }>(row: T) {
  return { ...row, isAtOrNearMaxCharge: isAtOrNearMaxCharge(row.chargeWeightGrains, row.publishedChargeMaxGrains) };
}

// GET /api/reloading/recipes - List all LoadRecipe entries
export async function GET() {
  try {
    const recipes = await prisma.loadRecipe.findMany({
      include: RECIPE_INCLUDE,
      orderBy: [{ caliberCartridge: "asc" }, { recipeName: "asc" }],
    });
    return NextResponse.json({ recipes: recipes.map(withCalculated) });
  } catch (error) {
    console.error("GET /api/reloading/recipes error:", error);
    return NextResponse.json({ error: "Failed to fetch load recipes" }, { status: 500 });
  }
}

// POST /api/reloading/recipes - Create a new LoadRecipe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recipeName, caliberCartridge, status, intendedUse, isFavorite, notes,
      bulletId, powderId, chargeWeightGrains, primerId, brassId, brassFireCount,
      coalIn, cbtoIn, jumpToLandsIn, crimpType, crimpAmountIn,
      publishedChargeMinGrains, publishedChargeMaxGrains, publishedVelocityFps,
      expectedVelocityFps, publishedPressurePsi, publishedPressureCup, publishedBarrelLengthIn,
      loadDataSource, primerAppearance, ejectorMarks, extractionDifficulty,
      caseHeadExpansionIn, pressureAssessment, pressureNotes, overrideMaxCharge,
    } = body;

    if (!recipeName || !caliberCartridge || chargeWeightGrains == null || coalIn == null) {
      return NextResponse.json(
        { error: "Missing required fields: recipeName, caliberCartridge, chargeWeightGrains, coalIn" },
        { status: 400 }
      );
    }
    if (
      publishedChargeMinGrains != null &&
      publishedChargeMaxGrains != null &&
      publishedChargeMinGrains > publishedChargeMaxGrains
    ) {
      return NextResponse.json({ error: "publishedChargeMinGrains must be <= publishedChargeMaxGrains" }, { status: 400 });
    }
    if (
      publishedChargeMaxGrains != null &&
      chargeWeightGrains > publishedChargeMaxGrains &&
      !overrideMaxCharge
    ) {
      return NextResponse.json(
        {
          error: `chargeWeightGrains (${chargeWeightGrains}gr) exceeds the published max charge (${publishedChargeMaxGrains}gr). Confirm the override to proceed.`,
          requiresOverride: true,
        },
        { status: 400 }
      );
    }
    if (cbtoIn != null && cbtoIn >= coalIn) {
      return NextResponse.json({ error: "cbtoIn must be less than coalIn" }, { status: 400 });
    }
    if (status === "Working / Proven" && pressureAssessment === "UNSAFE - Over Max") {
      return NextResponse.json(
        { error: "Cannot set status to Working / Proven while pressureAssessment is UNSAFE - Over Max" },
        { status: 400 }
      );
    }

    let bulletWeightGrains: number | null = null;
    let bulletDiameterIn: number | null = null;
    if (bulletId) {
      const bullet = await prisma.bulletInventory.findUnique({ where: { id: bulletId } });
      if (bullet) {
        bulletWeightGrains = bullet.weightGrains;
        bulletDiameterIn = bullet.caliberDiameterIn;
      }
    }

    const recipe = await prisma.loadRecipe.create({
      data: {
        recipeName,
        caliberCartridge,
        status: status ?? "Development",
        intendedUse: intendedUse ?? null,
        isFavorite: isFavorite ?? false,
        notes: notes ?? null,
        bulletId: bulletId ?? null,
        bulletWeightGrains,
        bulletDiameterIn,
        powderId: powderId ?? null,
        chargeWeightGrains,
        primerId: primerId ?? null,
        brassId: brassId ?? null,
        brassFireCount: brassFireCount ?? null,
        coalIn,
        cbtoIn: cbtoIn ?? null,
        jumpToLandsIn: jumpToLandsIn ?? null,
        crimpType: crimpType ?? null,
        crimpAmountIn: crimpAmountIn ?? null,
        publishedChargeMinGrains: publishedChargeMinGrains ?? null,
        publishedChargeMaxGrains: publishedChargeMaxGrains ?? null,
        publishedVelocityFps: publishedVelocityFps ?? null,
        expectedVelocityFps: expectedVelocityFps ?? null,
        publishedPressurePsi: publishedPressurePsi ?? null,
        publishedPressureCup: publishedPressureCup ?? null,
        publishedBarrelLengthIn: publishedBarrelLengthIn ?? null,
        loadDataSource: loadDataSource ?? null,
        primerAppearance: primerAppearance ?? null,
        ejectorMarks: ejectorMarks ?? null,
        extractionDifficulty: extractionDifficulty ?? null,
        caseHeadExpansionIn: caseHeadExpansionIn ?? null,
        pressureAssessment: pressureAssessment ?? null,
        pressureNotes: pressureNotes ?? null,
      },
      include: RECIPE_INCLUDE,
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(recipe), { status: 201 });
  } catch (error) {
    console.error("POST /api/reloading/recipes error:", error);
    return NextResponse.json({ error: "Failed to create load recipe" }, { status: 500 });
  }
}

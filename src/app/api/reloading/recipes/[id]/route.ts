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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const recipe = await prisma.loadRecipe.findUnique({ where: { id }, include: RECIPE_INCLUDE });
    if (!recipe) return NextResponse.json({ error: "Load recipe not found" }, { status: 404 });
    return NextResponse.json(withCalculated(recipe));
  } catch (error) {
    console.error("GET /api/reloading/recipes/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch load recipe" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.loadRecipe.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Load recipe not found" }, { status: 404 });

    const chargeWeightGrains = body.chargeWeightGrains ?? existing.chargeWeightGrains;
    const publishedChargeMinGrains = body.publishedChargeMinGrains !== undefined ? body.publishedChargeMinGrains : existing.publishedChargeMinGrains;
    const publishedChargeMaxGrains = body.publishedChargeMaxGrains !== undefined ? body.publishedChargeMaxGrains : existing.publishedChargeMaxGrains;
    const coalIn = body.coalIn ?? existing.coalIn;
    const cbtoIn = body.cbtoIn !== undefined ? body.cbtoIn : existing.cbtoIn;
    const status = body.status ?? existing.status;
    const pressureAssessment = body.pressureAssessment !== undefined ? body.pressureAssessment : existing.pressureAssessment;

    if (publishedChargeMinGrains != null && publishedChargeMaxGrains != null && publishedChargeMinGrains > publishedChargeMaxGrains) {
      return NextResponse.json({ error: "publishedChargeMinGrains must be <= publishedChargeMaxGrains" }, { status: 400 });
    }
    if (publishedChargeMaxGrains != null && chargeWeightGrains > publishedChargeMaxGrains && !body.overrideMaxCharge) {
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

    const fields = [
      "recipeName", "caliberCartridge", "status", "intendedUse", "isFavorite", "notes",
      "powderId", "chargeWeightGrains", "primerId", "brassId", "brassFireCount",
      "coalIn", "cbtoIn", "jumpToLandsIn", "crimpType", "crimpAmountIn",
      "publishedChargeMinGrains", "publishedChargeMaxGrains", "publishedVelocityFps",
      "expectedVelocityFps", "publishedPressurePsi", "publishedPressureCup", "publishedBarrelLengthIn",
      "loadDataSource", "primerAppearance", "ejectorMarks", "extractionDifficulty",
      "caseHeadExpansionIn", "pressureAssessment", "pressureNotes",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of fields) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    if (body.bulletId !== undefined) {
      data.bulletId = body.bulletId;
      if (body.bulletId) {
        const bullet = await prisma.bulletInventory.findUnique({ where: { id: body.bulletId } });
        data.bulletWeightGrains = bullet?.weightGrains ?? null;
        data.bulletDiameterIn = bullet?.caliberDiameterIn ?? null;
      } else {
        data.bulletWeightGrains = null;
        data.bulletDiameterIn = null;
      }
    }

    const updated = await prisma.loadRecipe.update({ where: { id }, data, include: RECIPE_INCLUDE });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(updated));
  } catch (error) {
    console.error("PUT /api/reloading/recipes/[id] error:", error);
    return NextResponse.json({ error: "Failed to update load recipe" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.loadRecipe.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Load recipe not found" }, { status: 404 });

    const batchCount = await prisma.reloadingBatch.count({ where: { recipeId: id } });
    const sessionCount = await prisma.chronographSession.count({ where: { recipeId: id } });

    await prisma.loadRecipe.delete({ where: { id } });
    revalidateDashboardData();
    return NextResponse.json({ success: true, id, batchCount, sessionCount });
  } catch (error) {
    console.error("DELETE /api/reloading/recipes/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete load recipe" }, { status: 500 });
  }
}

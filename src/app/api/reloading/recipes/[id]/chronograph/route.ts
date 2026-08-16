import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";
import { computeChronographStats, parseShotVelocities } from "@/lib/reloading/chronograph-stats";
import { groupSizeMoa } from "@/lib/reloading/costs";

function withCalculated<
  T extends { shotVelocities: string; groupSizeIn: number | null; groupDistanceYards: number | null }
>(row: T, expectedVelocityFps: number | null) {
  const shots = parseShotVelocities(row.shotVelocities);
  const stats = computeChronographStats(shots, expectedVelocityFps);
  return {
    ...row,
    shotVelocities: shots,
    ...stats,
    groupSizeMoa: groupSizeMoa(row.groupSizeIn, row.groupDistanceYards),
  };
}

// GET /api/reloading/recipes/[id]/chronograph - List sessions for a recipe
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const recipe = await prisma.loadRecipe.findUnique({ where: { id }, select: { expectedVelocityFps: true } });
    if (!recipe) return NextResponse.json({ error: "Load recipe not found" }, { status: 404 });

    const sessions = await prisma.chronographSession.findMany({
      where: { recipeId: id },
      include: { firearm: { select: { id: true, name: true } } },
      orderBy: { sessionDate: "desc" },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => withCalculated(s, recipe.expectedVelocityFps)),
    });
  } catch (error) {
    console.error("GET /api/reloading/recipes/[id]/chronograph error:", error);
    return NextResponse.json({ error: "Failed to fetch chronograph sessions" }, { status: 500 });
  }
}

// POST /api/reloading/recipes/[id]/chronograph - Log a new ChronographSession
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      sessionDate, sessionLabel, firearmId, barrelLengthIn, testDistanceYards, chronographModel,
      temperatureFahrenheit, altitudeFt, humidityPercent, weatherConditions, shotVelocities,
      groupSizeIn, groupDistanceYards, numberOfShotsInGroup, pointOfImpactNotes,
      sessionNotes, isConfirmationSession,
    } = body;

    const recipe = await prisma.loadRecipe.findUnique({ where: { id }, select: { id: true, expectedVelocityFps: true } });
    if (!recipe) return NextResponse.json({ error: "Load recipe not found" }, { status: 404 });

    if (!sessionDate) {
      return NextResponse.json({ error: "Missing required field: sessionDate" }, { status: 400 });
    }
    if (!Array.isArray(shotVelocities) || shotVelocities.length === 0) {
      return NextResponse.json({ error: "shotVelocities must be a non-empty array" }, { status: 400 });
    }
    if (!shotVelocities.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0)) {
      return NextResponse.json({ error: "shotVelocities must contain only positive numbers" }, { status: 400 });
    }
    if (temperatureFahrenheit != null && (temperatureFahrenheit < -40 || temperatureFahrenheit > 140)) {
      return NextResponse.json({ error: "temperatureFahrenheit must be between -40 and 140" }, { status: 400 });
    }
    if (altitudeFt != null && (altitudeFt < 0 || altitudeFt > 15000)) {
      return NextResponse.json({ error: "altitudeFt must be between 0 and 15000" }, { status: 400 });
    }

    const session = await prisma.chronographSession.create({
      data: {
        recipeId: id,
        sessionDate: new Date(sessionDate),
        sessionLabel: sessionLabel ?? null,
        firearmId: firearmId ?? null,
        barrelLengthIn: barrelLengthIn ?? null,
        testDistanceYards: testDistanceYards ?? null,
        chronographModel: chronographModel ?? null,
        temperatureFahrenheit: temperatureFahrenheit ?? null,
        altitudeFt: altitudeFt ?? null,
        humidityPercent: humidityPercent ?? null,
        weatherConditions: weatherConditions ?? null,
        shotVelocities: JSON.stringify(shotVelocities),
        groupSizeIn: groupSizeIn ?? null,
        groupDistanceYards: groupDistanceYards ?? null,
        numberOfShotsInGroup: numberOfShotsInGroup ?? null,
        pointOfImpactNotes: pointOfImpactNotes ?? null,
        sessionNotes: sessionNotes ?? null,
        isConfirmationSession: isConfirmationSession ?? false,
      },
      include: { firearm: { select: { id: true, name: true } } },
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(session, recipe.expectedVelocityFps), { status: 201 });
  } catch (error) {
    console.error("POST /api/reloading/recipes/[id]/chronograph error:", error);
    return NextResponse.json({ error: "Failed to log chronograph session" }, { status: 500 });
  }
}

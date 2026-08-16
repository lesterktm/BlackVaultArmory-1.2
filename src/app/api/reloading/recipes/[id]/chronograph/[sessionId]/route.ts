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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params;
    const recipe = await prisma.loadRecipe.findUnique({ where: { id }, select: { expectedVelocityFps: true } });
    if (!recipe) return NextResponse.json({ error: "Load recipe not found" }, { status: 404 });

    const session = await prisma.chronographSession.findUnique({
      where: { id: sessionId },
      include: { firearm: { select: { id: true, name: true } } },
    });
    if (!session || session.recipeId !== id) {
      return NextResponse.json({ error: "Chronograph session not found" }, { status: 404 });
    }
    return NextResponse.json(withCalculated(session, recipe.expectedVelocityFps));
  } catch (error) {
    console.error("GET chronograph session error:", error);
    return NextResponse.json({ error: "Failed to fetch chronograph session" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params;
    const body = await request.json();

    const recipe = await prisma.loadRecipe.findUnique({ where: { id }, select: { expectedVelocityFps: true } });
    if (!recipe) return NextResponse.json({ error: "Load recipe not found" }, { status: 404 });

    const existing = await prisma.chronographSession.findUnique({ where: { id: sessionId } });
    if (!existing || existing.recipeId !== id) {
      return NextResponse.json({ error: "Chronograph session not found" }, { status: 404 });
    }

    if (body.shotVelocities !== undefined) {
      if (!Array.isArray(body.shotVelocities) || body.shotVelocities.length === 0) {
        return NextResponse.json({ error: "shotVelocities must be a non-empty array" }, { status: 400 });
      }
      if (!body.shotVelocities.every((v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0)) {
        return NextResponse.json({ error: "shotVelocities must contain only positive numbers" }, { status: 400 });
      }
    }

    const fields = [
      "sessionLabel", "firearmId", "barrelLengthIn", "testDistanceYards", "chronographModel",
      "temperatureFahrenheit", "altitudeFt", "humidityPercent", "weatherConditions",
      "groupSizeIn", "groupDistanceYards", "numberOfShotsInGroup", "pointOfImpactNotes",
      "sessionNotes", "isConfirmationSession",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of fields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.sessionDate !== undefined) data.sessionDate = new Date(body.sessionDate);
    if (body.shotVelocities !== undefined) data.shotVelocities = JSON.stringify(body.shotVelocities);

    const updated = await prisma.chronographSession.update({
      where: { id: sessionId },
      data,
      include: { firearm: { select: { id: true, name: true } } },
    });

    revalidateDashboardData();
    return NextResponse.json(withCalculated(updated, recipe.expectedVelocityFps));
  } catch (error) {
    console.error("PUT chronograph session error:", error);
    return NextResponse.json({ error: "Failed to update chronograph session" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params;
    const existing = await prisma.chronographSession.findUnique({ where: { id: sessionId } });
    if (!existing || existing.recipeId !== id) {
      return NextResponse.json({ error: "Chronograph session not found" }, { status: 404 });
    }

    await prisma.chronographSession.delete({ where: { id: sessionId } });
    revalidateDashboardData();
    return NextResponse.json({ success: true, id: sessionId });
  } catch (error) {
    console.error("DELETE chronograph session error:", error);
    return NextResponse.json({ error: "Failed to delete chronograph session" }, { status: 500 });
  }
}

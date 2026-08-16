// Derives every ChronographSession "(calculated)" statistic from the raw
// shotVelocities array. Used both server-side (API responses) and client-side
// (live preview while entering a shot string before saving).

export interface ChronographStats {
  shotCount: number;
  avgVelocityFps: number | null;
  minVelocityFps: number | null;
  maxVelocityFps: number | null;
  extremeSpreadFps: number | null;
  standardDeviationFps: number | null;
  meanAbsoluteDeviationFps: number | null;
  velocityDeltaFps: number | null;
}

export function computeChronographStats(
  shotVelocities: number[],
  expectedVelocityFps?: number | null
): ChronographStats {
  const shots = shotVelocities.filter((v) => Number.isFinite(v));
  const shotCount = shots.length;

  if (shotCount === 0) {
    return {
      shotCount: 0,
      avgVelocityFps: null,
      minVelocityFps: null,
      maxVelocityFps: null,
      extremeSpreadFps: null,
      standardDeviationFps: null,
      meanAbsoluteDeviationFps: null,
      velocityDeltaFps: null,
    };
  }

  const avg = shots.reduce((sum, v) => sum + v, 0) / shotCount;
  const min = Math.min(...shots);
  const max = Math.max(...shots);
  const extremeSpread = max - min;

  const variance = shots.reduce((sum, v) => sum + (v - avg) ** 2, 0) / shotCount;
  const standardDeviation = Math.sqrt(variance);
  const meanAbsoluteDeviation = shots.reduce((sum, v) => sum + Math.abs(v - avg), 0) / shotCount;

  const velocityDelta = expectedVelocityFps == null ? null : avg - expectedVelocityFps;

  return {
    shotCount,
    avgVelocityFps: avg,
    minVelocityFps: min,
    maxVelocityFps: max,
    extremeSpreadFps: extremeSpread,
    standardDeviationFps: standardDeviation,
    meanAbsoluteDeviationFps: meanAbsoluteDeviation,
    velocityDeltaFps: velocityDelta,
  };
}

export function parseShotVelocities(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "number") : [];
  } catch {
    return [];
  }
}

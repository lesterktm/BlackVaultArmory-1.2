// All "(calculated)" fields from the Reloading module spec live here as pure
// functions instead of stored columns, so they can never drift from their
// source values. Every API route that returns these entities runs the raw
// fields through the relevant function before responding.

const GRAINS_PER_POUND = 7000;

export function costPerPound(purchasePrice: number | null, quantityOnHandGrains: number | null): number | null {
  if (purchasePrice == null || !quantityOnHandGrains) return null;
  const lbs = quantityOnHandGrains / GRAINS_PER_POUND;
  if (lbs <= 0) return null;
  return purchasePrice / lbs;
}

export function quantityOnHandLbs(quantityOnHandGrains: number | null | undefined): number | null {
  if (quantityOnHandGrains == null) return null;
  return quantityOnHandGrains / GRAINS_PER_POUND;
}

export function costPerThousand(purchasePrice: number | null, quantityOnHand: number | null): number | null {
  if (purchasePrice == null || !quantityOnHand) return null;
  return (purchasePrice / quantityOnHand) * 1000;
}

export function costPerCase(purchasePrice: number | null, quantityOnHand: number | null): number | null {
  if (purchasePrice == null || !quantityOnHand) return null;
  return purchasePrice / quantityOnHand;
}

export function costPerBullet(purchasePrice: number | null, quantityOnHand: number | null): number | null {
  if (purchasePrice == null || !quantityOnHand) return null;
  return purchasePrice / quantityOnHand;
}

export function costPerHundred(costPerUnit: number | null): number | null {
  if (costPerUnit == null) return null;
  return costPerUnit * 100;
}

export function sectionalDensity(weightGrains: number | null, diameterIn: number | null): number | null {
  if (weightGrains == null || !diameterIn) return null;
  return weightGrains / (diameterIn * diameterIn * GRAINS_PER_POUND);
}

export function isAtOrNearMaxCharge(
  chargeWeightGrains: number | null | undefined,
  publishedChargeMaxGrains: number | null | undefined
): boolean | null {
  if (chargeWeightGrains == null || publishedChargeMaxGrains == null) return null;
  return chargeWeightGrains >= publishedChargeMaxGrains * 0.95;
}

export function groupSizeMoa(groupSizeIn: number | null, groupDistanceYards: number | null): number | null {
  if (groupSizeIn == null || !groupDistanceYards) return null;
  return (groupSizeIn / groupDistanceYards) * 95.5;
}

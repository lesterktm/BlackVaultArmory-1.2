import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";
import { costPerBullet, costPerCase, costPerPound, costPerThousand } from "@/lib/reloading/costs";

// GET /api/reloading/batches - List all ReloadingBatch entries, newest first
export async function GET() {
  try {
    const batches = await prisma.reloadingBatch.findMany({
      include: { recipe: true, ammoStock: true },
      orderBy: { batchDate: "desc" },
    });
    return NextResponse.json({ batches });
  } catch (error) {
    console.error("GET /api/reloading/batches error:", error);
    return NextResponse.json({ error: "Failed to fetch reloading batches" }, { status: 500 });
  }
}

// POST /api/reloading/batches - Log a reloading batch
// Body: { recipeId, batchDate, quantityProduced, reusedBrass?, notes? }
// Consumes linked inventory (bullet/primer/brass = qty, powder = chargeWeightGrains * qty,
// brass skipped if reusedBrass), and adds the produced rounds into Ammo stock.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipeId, batchDate, quantityProduced, reusedBrass, notes } = body;

    if (!recipeId || !batchDate || quantityProduced === undefined || quantityProduced === null) {
      return NextResponse.json(
        { error: "Missing required fields: recipeId, batchDate, quantityProduced" },
        { status: 400 }
      );
    }
    if (!Number.isInteger(quantityProduced) || quantityProduced <= 0) {
      return NextResponse.json({ error: "quantityProduced must be a positive integer" }, { status: 400 });
    }

    const recipe = await prisma.loadRecipe.findUnique({
      where: { id: recipeId },
      include: { bullet: true, powder: true, primer: true, brass: true },
    });
    if (!recipe) return NextResponse.json({ error: "Load recipe not found" }, { status: 404 });

    const shortfalls: string[] = [];
    let bulletNeeded = 0;
    let powderNeeded = 0;
    let primerNeeded = 0;
    let brassNeeded = 0;

    if (recipe.bullet) {
      bulletNeeded = quantityProduced;
      if (bulletNeeded > recipe.bullet.quantityOnHand) {
        shortfalls.push(`bullet (${recipe.bullet.productName}): need ${bulletNeeded}, have ${recipe.bullet.quantityOnHand}`);
      }
    }
    if (recipe.powder) {
      powderNeeded = recipe.chargeWeightGrains * quantityProduced;
      if (powderNeeded > recipe.powder.quantityOnHandGrains) {
        shortfalls.push(`powder (${recipe.powder.productName}): need ${powderNeeded}gr, have ${recipe.powder.quantityOnHandGrains}gr`);
      }
    }
    if (recipe.primer) {
      primerNeeded = quantityProduced;
      if (primerNeeded > recipe.primer.quantityOnHand) {
        shortfalls.push(`primer (${recipe.primer.productName}): need ${primerNeeded}, have ${recipe.primer.quantityOnHand}`);
      }
    }
    if (recipe.brass && !reusedBrass) {
      brassNeeded = quantityProduced;
      if (brassNeeded > recipe.brass.quantityOnHand) {
        shortfalls.push(`brass (${recipe.brass.caliber} lot): need ${brassNeeded}, have ${recipe.brass.quantityOnHand}`);
      }
    }

    if (shortfalls.length > 0) {
      return NextResponse.json({ error: `Insufficient component stock: ${shortfalls.join("; ")}` }, { status: 400 });
    }

    // Reuse the same calculated-field cost functions the inventory pages display,
    // rather than inventing a separate per-unit price field.
    const bulletUnitCost = recipe.bullet ? costPerBullet(recipe.bullet.purchasePrice, recipe.bullet.quantityOnHand) : null;
    const primerUnitCost = recipe.primer ? costPerThousand(recipe.primer.purchasePrice, recipe.primer.quantityOnHand) : null;
    const powderCostPerLb = recipe.powder ? costPerPound(recipe.powder.purchasePrice, recipe.powder.quantityOnHandGrains) : null;
    const brassUnitCost = recipe.brass && !reusedBrass ? costPerCase(recipe.brass.purchasePrice, recipe.brass.quantityOnHand) : null;

    let totalCost: number | null = null;
    if (bulletUnitCost != null || primerUnitCost != null || powderCostPerLb != null || brassUnitCost != null) {
      const perRound =
        (bulletUnitCost ?? 0) +
        (primerUnitCost != null ? primerUnitCost / 1000 : 0) +
        (powderCostPerLb != null ? (powderCostPerLb / 7000) * recipe.chargeWeightGrains : 0) +
        (brassUnitCost ?? 0);
      totalCost = perRound * quantityProduced;
    }
    const costPerRound = totalCost != null ? totalCost / quantityProduced : null;

    const result = await prisma.$transaction(async (tx) => {
      if (recipe.bullet) {
        const newQty = recipe.bullet.quantityOnHand - bulletNeeded;
        await tx.bulletInventory.update({ where: { id: recipe.bullet.id }, data: { quantityOnHand: newQty } });
      }
      if (recipe.powder) {
        const newQty = recipe.powder.quantityOnHandGrains - powderNeeded;
        await tx.powderInventory.update({ where: { id: recipe.powder.id }, data: { quantityOnHandGrains: newQty } });
      }
      if (recipe.primer) {
        const newQty = recipe.primer.quantityOnHand - primerNeeded;
        await tx.primerInventory.update({ where: { id: recipe.primer.id }, data: { quantityOnHand: newQty } });
      }
      if (recipe.brass && !reusedBrass) {
        const newQty = recipe.brass.quantityOnHand - brassNeeded;
        await tx.brassInventory.update({ where: { id: recipe.brass.id }, data: { quantityOnHand: newQty } });
      }

      // Find or create an AmmoStock lot to hold the produced rounds
      const ammoBrand = `Reloaded — ${recipe.recipeName}`;
      let ammoStock = await tx.ammoStock.findFirst({ where: { caliber: recipe.caliberCartridge, brand: ammoBrand } });

      if (ammoStock) {
        const previousQty = ammoStock.quantity;
        const newQty = previousQty + quantityProduced;
        ammoStock = await tx.ammoStock.update({ where: { id: ammoStock.id }, data: { quantity: newQty } });
        await tx.ammoTransaction.create({
          data: {
            stockId: ammoStock.id,
            type: "PURCHASE",
            quantity: quantityProduced,
            previousQty,
            newQty,
            note: `Reloading batch (${batchDate})`,
            pricePerRound: costPerRound,
          },
        });
      } else {
        ammoStock = await tx.ammoStock.create({
          data: {
            caliber: recipe.caliberCartridge,
            brand: ammoBrand,
            grainWeight: recipe.bulletWeightGrains ?? null,
            quantity: quantityProduced,
            pricePerRound: costPerRound,
            notes: "Auto-created by Reloading batch logging.",
          },
        });
        await tx.ammoTransaction.create({
          data: {
            stockId: ammoStock.id,
            type: "PURCHASE",
            quantity: quantityProduced,
            previousQty: 0,
            newQty: quantityProduced,
            note: `Reloading batch (${batchDate})`,
            pricePerRound: costPerRound,
          },
        });
      }

      const batch = await tx.reloadingBatch.create({
        data: {
          recipeId,
          batchDate: new Date(batchDate),
          quantityProduced,
          reusedBrass: reusedBrass ?? false,
          totalCost,
          costPerRound,
          notes: notes ?? null,
          ammoStockId: ammoStock.id,
        },
        include: { recipe: true, ammoStock: true },
      });

      // Ledger entries per consumed inventory type, linked back to this batch
      if (recipe.bullet) {
        await tx.bulletTransaction.create({
          data: {
            bulletId: recipe.bullet.id,
            type: "CONSUMED",
            quantity: bulletNeeded,
            previousQty: recipe.bullet.quantityOnHand,
            newQty: recipe.bullet.quantityOnHand - bulletNeeded,
            note: `Batch: ${recipe.recipeName}`,
            batchId: batch.id,
          },
        });
      }
      if (recipe.powder) {
        await tx.powderTransaction.create({
          data: {
            powderId: recipe.powder.id,
            type: "CONSUMED",
            quantity: powderNeeded,
            previousQty: recipe.powder.quantityOnHandGrains,
            newQty: recipe.powder.quantityOnHandGrains - powderNeeded,
            note: `Batch: ${recipe.recipeName}`,
            batchId: batch.id,
          },
        });
      }
      if (recipe.primer) {
        await tx.primerTransaction.create({
          data: {
            primerId: recipe.primer.id,
            type: "CONSUMED",
            quantity: primerNeeded,
            previousQty: recipe.primer.quantityOnHand,
            newQty: recipe.primer.quantityOnHand - primerNeeded,
            note: `Batch: ${recipe.recipeName}`,
            batchId: batch.id,
          },
        });
      }
      if (recipe.brass && !reusedBrass) {
        await tx.brassTransaction.create({
          data: {
            brassId: recipe.brass.id,
            type: "CONSUMED",
            quantity: brassNeeded,
            previousQty: recipe.brass.quantityOnHand,
            newQty: recipe.brass.quantityOnHand - brassNeeded,
            note: `Batch: ${recipe.recipeName}`,
            batchId: batch.id,
          },
        });
      }

      return batch;
    });

    revalidateDashboardData();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/reloading/batches error:", error);
    return NextResponse.json({ error: "Failed to log reloading batch" }, { status: 500 });
  }
}

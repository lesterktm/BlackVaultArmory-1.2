import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";

const ADD_TYPES = new Set(["PURCHASE"]);
const SUBTRACT_TYPES = new Set(["CONSUMED"]);
const CORRECTION_TYPES = new Set(["ADJUSTMENT"]);

// POST /api/reloading/bullet/[id]/transactions - Post a bullet ledger entry
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, quantity, note, purchasePrice, pricePerUnit, purchaseDate } = body;

    if (!type || quantity === undefined || quantity === null) {
      return NextResponse.json({ error: "Missing required fields: type, quantity" }, { status: 400 });
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0) {
      return NextResponse.json({ error: "quantity must be a non-negative integer" }, { status: 400 });
    }
    const validTypes = ["PURCHASE", "CONSUMED", "ADJUSTMENT"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid transaction type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const bullet = await prisma.bulletInventory.findUnique({ where: { id } });
    if (!bullet) return NextResponse.json({ error: "Bullet inventory entry not found" }, { status: 404 });

    const previousQty = bullet.quantityOnHand;
    let newQty: number;
    if (ADD_TYPES.has(type)) {
      newQty = previousQty + quantity;
    } else if (SUBTRACT_TYPES.has(type)) {
      newQty = previousQty - quantity;
      if (newQty < 0) {
        return NextResponse.json({ error: `Insufficient quantity. Current stock: ${previousQty}, requested: ${quantity}` }, { status: 400 });
      }
    } else if (CORRECTION_TYPES.has(type)) {
      newQty = quantity;
    } else {
      newQty = previousQty;
    }

    const [updated, transaction] = await prisma.$transaction([
      prisma.bulletInventory.update({ where: { id }, data: { quantityOnHand: newQty } }),
      prisma.bulletTransaction.create({
        data: {
          bulletId: id,
          type,
          quantity,
          previousQty,
          newQty,
          note: note ?? null,
          purchasePrice: purchasePrice ?? null,
          pricePerUnit: pricePerUnit ?? null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        },
      }),
    ]);

    revalidateDashboardData();
    return NextResponse.json({ bullet: updated, transaction }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reloading/bullet/[id]/transactions error:", error);
    return NextResponse.json({ error: "Failed to create bullet transaction" }, { status: 500 });
  }
}

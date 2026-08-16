import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";

const ADD_TYPES = new Set(["PURCHASE"]);
const SUBTRACT_TYPES = new Set(["CONSUMED"]);
const CORRECTION_TYPES = new Set(["ADJUSTMENT"]);

// POST /api/reloading/powder/[id]/transactions - Post a powder ledger entry
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, quantity, note, purchasePrice, pricePerUnit, purchaseDate } = body;

    if (!type || quantity === undefined || quantity === null) {
      return NextResponse.json({ error: "Missing required fields: type, quantity" }, { status: 400 });
    }
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json({ error: "quantity must be a non-negative number" }, { status: 400 });
    }
    const validTypes = ["PURCHASE", "CONSUMED", "ADJUSTMENT"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid transaction type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const powder = await prisma.powderInventory.findUnique({ where: { id } });
    if (!powder) return NextResponse.json({ error: "Powder inventory entry not found" }, { status: 404 });

    const previousQty = powder.quantityOnHandGrains;
    let newQty: number;
    if (ADD_TYPES.has(type)) {
      newQty = previousQty + quantity;
    } else if (SUBTRACT_TYPES.has(type)) {
      newQty = previousQty - quantity;
      if (newQty < 0) {
        return NextResponse.json({ error: `Insufficient quantity. Current stock: ${previousQty} gr, requested: ${quantity} gr` }, { status: 400 });
      }
    } else if (CORRECTION_TYPES.has(type)) {
      newQty = quantity;
    } else {
      newQty = previousQty;
    }

    const [updated, transaction] = await prisma.$transaction([
      prisma.powderInventory.update({ where: { id }, data: { quantityOnHandGrains: newQty } }),
      prisma.powderTransaction.create({
        data: {
          powderId: id,
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
    return NextResponse.json({ powder: updated, transaction }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reloading/powder/[id]/transactions error:", error);
    return NextResponse.json({ error: "Failed to create powder transaction" }, { status: 500 });
  }
}

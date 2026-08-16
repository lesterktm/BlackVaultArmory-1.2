import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateDashboardData } from "@/lib/dashboard/revalidate-dashboard";

// DELETE /api/reloading/batches/[id] - Delete a ReloadingBatch log entry
// Intentionally does NOT restore consumed components or subtract produced rounds
// back out of Ammo stock — this removes the log record only. See plan notes.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.reloadingBatch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Reloading batch not found" }, { status: 404 });
    }

    await prisma.reloadingBatch.delete({ where: { id } });
    revalidateDashboardData();

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/reloading/batches/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete reloading batch" },
      { status: 500 }
    );
  }
}

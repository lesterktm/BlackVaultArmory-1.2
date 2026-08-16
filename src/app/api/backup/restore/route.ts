import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/server/auth";
import JSZip from "jszip";
import { resolveBackupFileWritePath } from "@/lib/server/backup-files";

const REQUIRED_ARRAY_KEYS = [
  "firearms",
  "builds",
  "buildSlots",
  "accessories",
  "documents",
  "roundCountLogs",
  "ammoStocks",
  "ammoTransactions",
  "rangeSessions",
  "rangeSessionAmmoLinks",
  "sessionDrills",
  "imageCache",
] as const;

type BackupBody = { meta: { version: string } } & Record<
  (typeof REQUIRED_ARRAY_KEYS)[number],
  unknown[]
>;

function isValidBackup(body: unknown): body is BackupBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!b.meta || typeof (b.meta as Record<string, unknown>).version !== "string") return false;
  return REQUIRED_ARRAY_KEYS.every((k) => Array.isArray(b[k]));
}

async function restoreDatabaseRows(body: BackupBody) {
  const {
    firearms,
    builds,
    buildSlots,
    accessories,
    documents,
    roundCountLogs,
    ammoStocks,
    ammoTransactions,
    rangeSessions,
    rangeSessionAmmoLinks,
    sessionDrills,
    imageCache,
  } = body;

  await prisma.$transaction(
    async (tx) => {
      // Delete in FK-safe order (children before parents — mirrors reset-db.ts)
      await tx.sessionDrill.deleteMany();
      await tx.rangeSessionAmmoLink.deleteMany();
      await tx.ammoTransaction.deleteMany();
      await tx.rangeSession.deleteMany();
      await tx.roundCountLog.deleteMany();
      await tx.buildSlot.deleteMany();
      await tx.build.deleteMany();
      await tx.document.deleteMany();
      await tx.imageCache.deleteMany();
      await tx.accessory.deleteMany();
      await tx.ammoStock.deleteMany();
      await tx.firearm.deleteMany();
      // AppSettings intentionally NOT touched — preserve LAN/path config

      // Insert in parent-first order
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (firearms.length) await tx.firearm.createMany({ data: firearms as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (accessories.length) await tx.accessory.createMany({ data: accessories as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (ammoStocks.length) await tx.ammoStock.createMany({ data: ammoStocks as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (builds.length) await tx.build.createMany({ data: builds as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (buildSlots.length) await tx.buildSlot.createMany({ data: buildSlots as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (documents.length) await tx.document.createMany({ data: documents as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (imageCache.length) await tx.imageCache.createMany({ data: imageCache as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (rangeSessions.length) await tx.rangeSession.createMany({ data: rangeSessions as any[] });
      if (rangeSessionAmmoLinks.length)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.rangeSessionAmmoLink.createMany({ data: rangeSessionAmmoLinks as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (ammoTransactions.length) await tx.ammoTransaction.createMany({ data: ammoTransactions as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (roundCountLogs.length) await tx.roundCountLog.createMany({ data: roundCountLogs as any[] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (sessionDrills.length) await tx.sessionDrill.createMany({ data: sessionDrills as any[] });
    },
    { timeout: 30000 }
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth) return auth;

  const contentType = request.headers.get("content-type") ?? "";

  let fileBuffer: Buffer | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing required field: file" }, { status: 400 });
    }
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } else {
    // Legacy path: raw JSON body (backups taken before file bundling existed)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!isValidBackup(body)) {
      return NextResponse.json(
        { error: "Invalid backup file. Missing required fields or wrong format." },
        { status: 400 }
      );
    }
    try {
      await restoreDatabaseRows(body);
      return NextResponse.json({
        success: true,
        counts: Object.fromEntries(REQUIRED_ARRAY_KEYS.map((k) => [k, body[k].length])),
      });
    } catch (error) {
      console.error("POST /api/backup/restore error:", error);
      return NextResponse.json(
        { error: "Restore failed. Your data has not been modified." },
        { status: 500 }
      );
    }
  }

  const isZip = fileBuffer.length >= 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b;

  if (!isZip) {
    // A .json backup file uploaded via the file picker
    let body: unknown;
    try {
      body = JSON.parse(fileBuffer.toString("utf8"));
    } catch {
      return NextResponse.json(
        { error: "The selected file is not a valid .json or .zip backup." },
        { status: 400 }
      );
    }
    if (!isValidBackup(body)) {
      return NextResponse.json(
        { error: "Invalid backup file. Missing required fields or wrong format." },
        { status: 400 }
      );
    }
    try {
      await restoreDatabaseRows(body);
      return NextResponse.json({
        success: true,
        counts: Object.fromEntries(REQUIRED_ARRAY_KEYS.map((k) => [k, body[k].length])),
      });
    } catch (error) {
      console.error("POST /api/backup/restore error:", error);
      return NextResponse.json(
        { error: "Restore failed. Your data has not been modified." },
        { status: 500 }
      );
    }
  }

  // Zip backup: contains backup.json plus the actual uploaded files under files/
  try {
    const zip = await JSZip.loadAsync(fileBuffer);
    const backupEntry = zip.file("backup.json");
    if (!backupEntry) {
      return NextResponse.json(
        { error: "Invalid backup zip. Missing backup.json." },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(await backupEntry.async("string"));
    } catch {
      return NextResponse.json({ error: "backup.json inside the zip is not valid JSON." }, { status: 400 });
    }
    if (!isValidBackup(body)) {
      return NextResponse.json(
        { error: "Invalid backup file. Missing required fields or wrong format." },
        { status: 400 }
      );
    }

    await restoreDatabaseRows(body);

    let restoredFiles = 0;
    let skippedFiles = 0;
    const fileEntries = Object.values(zip.files).filter((f) => !f.dir && f.name !== "backup.json");
    for (const entry of fileEntries) {
      const writePath = resolveBackupFileWritePath(entry.name);
      if (!writePath) {
        skippedFiles += 1;
        continue;
      }
      try {
        const buffer = await entry.async("nodebuffer");
        await fs.mkdir(path.dirname(writePath), { recursive: true });
        await fs.writeFile(writePath, buffer);
        restoredFiles += 1;
      } catch (err) {
        console.warn(`Could not restore file ${entry.name}:`, err);
        skippedFiles += 1;
      }
    }

    return NextResponse.json({
      success: true,
      counts: Object.fromEntries(REQUIRED_ARRAY_KEYS.map((k) => [k, body[k].length])),
      fileCounts: { restored: restoredFiles, skipped: skippedFiles },
    });
  } catch (error) {
    console.error("POST /api/backup/restore error:", error);
    return NextResponse.json(
      { error: "Restore failed. Your data has not been modified." },
      { status: 500 }
    );
  }
}

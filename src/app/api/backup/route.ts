import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/server/auth";
import { collectBackupFileEntries, readBackupFiles } from "@/lib/server/backup-files";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

export async function POST() {
  const auth = await requireAuth();
  if (auth) return auth;

  try {
    // Sequential queries — connection_limit=1 means Promise.all would deadlock
    const firearms             = await prisma.firearm.findMany({ orderBy: { createdAt: "asc" } });
    const builds               = await prisma.build.findMany({ orderBy: { createdAt: "asc" } });
    const buildSlots           = await prisma.buildSlot.findMany();
    const accessories          = await prisma.accessory.findMany({ orderBy: { createdAt: "asc" } });
    const documents            = await prisma.document.findMany({ orderBy: { createdAt: "asc" } });
    const roundCountLogs       = await prisma.roundCountLog.findMany({ orderBy: { loggedAt: "asc" } });
    const ammoStocks           = await prisma.ammoStock.findMany({ orderBy: { createdAt: "asc" } });
    const ammoTransactions     = await prisma.ammoTransaction.findMany({ orderBy: { transactedAt: "asc" } });
    const rangeSessions        = await prisma.rangeSession.findMany({ orderBy: { sessionDate: "asc" } });
    const rangeSessionAmmoLinks = await prisma.rangeSessionAmmoLink.findMany();
    const sessionDrills        = await prisma.sessionDrill.findMany({ orderBy: { createdAt: "asc" } });
    const imageCache           = await prisma.imageCache.findMany();
    const settings             = await prisma.appSettings.findUnique({ where: { id: "singleton" } });

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

    const backupData = {
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
    };

    const includeUploads = settings?.includeUploadsInBackup ?? true;

    const meta = {
      version: "1.0",
      createdAt: now.toISOString(),
      includeUploads,
      counts: Object.fromEntries(Object.entries(backupData).map(([k, v]) => [k, v.length])),
    };

    const payload = { meta, ...backupData };
    const json = JSON.stringify(payload, null, 2);

    // includeUploads=false keeps the original lightweight JSON-only response —
    // no files, no zip overhead, unchanged from before this feature existed.
    if (!includeUploads) {
      const filename = `blackvault-backup-${timestamp}.json`;
      const sizeMB = (Buffer.byteLength(json, "utf8") / 1_048_576).toFixed(2);

      let savedToPath: string | undefined;
      if (settings?.backupDestinationPath) {
        try {
          const destDir = settings.backupDestinationPath;
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          const fullPath = path.join(destDir, filename);
          fs.writeFileSync(fullPath, json, "utf8");
          savedToPath = fullPath;
        } catch (fsErr) {
          console.warn("Could not write backup to disk:", fsErr);
        }
      }

      return NextResponse.json({ success: true, filename, meta, data: backupData, savedToPath, sizeMB });
    }

    // includeUploads=true: bundle the JSON data together with the actual
    // uploaded document/image files into a single zip, so backup and restore
    // move everything as one unit instead of just path references.
    const fileEntries = collectBackupFileEntries({ documents, firearms, accessories });
    const { found, missing } = await readBackupFiles(fileEntries);

    const zip = new JSZip();
    zip.file("backup.json", json);
    for (const entry of found) {
      zip.file(entry.zipPath, entry.buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const filename = `blackvault-backup-${timestamp}.zip`;
    const sizeMB = (zipBuffer.byteLength / 1_048_576).toFixed(2);

    let savedToPath: string | undefined;
    if (settings?.backupDestinationPath) {
      try {
        const destDir = settings.backupDestinationPath;
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const fullPath = path.join(destDir, filename);
        fs.writeFileSync(fullPath, zipBuffer);
        savedToPath = fullPath;
      } catch (fsErr) {
        console.warn("Could not write backup to disk:", fsErr);
      }
    }

    if (missing.length > 0) {
      console.warn(
        `Backup: ${missing.length} referenced file(s) were not found on disk and were skipped:`,
        missing.map((m) => m.diskPath)
      );
    }

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Backup-Filename": filename,
        "X-Backup-Size-Mb": sizeMB,
        "X-Backup-File-Count": String(found.length),
        "X-Backup-Missing-File-Count": String(missing.length),
        "X-Backup-Saved-Path": savedToPath ? encodeURIComponent(savedToPath) : "",
      },
    });
  } catch (error) {
    console.error("POST /api/backup error:", error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}

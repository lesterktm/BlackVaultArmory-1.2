import { promises as fs } from "fs";
import path from "path";
import { getCanonicalUploadsRoot, resolveDocumentStoragePath } from "@/lib/upload-security";

export interface BackupFileEntry {
  // Path inside the backup zip, e.g. "files/documents/abc123.pdf"
  zipPath: string;
  // Absolute path on disk
  diskPath: string;
}

const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

function resolveImageStoragePath(imageUrl: string): string | null {
  if (!imageUrl.startsWith("/uploads/images/")) return null;
  const segments = imageUrl.slice("/uploads/images/".length).split("/").filter(Boolean);
  if (segments.length === 0 || !segments.every((seg) => SAFE_SEGMENT.test(seg))) return null;

  const imagesRoot = path.resolve(getCanonicalUploadsRoot(), "images");
  const resolvedPath = path.resolve(imagesRoot, ...segments);
  if (!resolvedPath.startsWith(`${imagesRoot}${path.sep}`)) return null;
  return resolvedPath;
}

interface EntityImageRow {
  imageUrl: string | null;
  imageSource: string | null;
}

// Walks the DB rows that carry local file references (documents + entity
// images) and resolves each to a disk path, skipping anything external
// (imageSource other than "uploaded", e.g. google_cse/url/seed) or unsafe.
export function collectBackupFileEntries(params: {
  documents: Array<{ fileUrl: string }>;
  firearms: EntityImageRow[];
  accessories: EntityImageRow[];
}): BackupFileEntry[] {
  const entries: BackupFileEntry[] = [];
  const seenZipPaths = new Set<string>();

  function addEntry(diskPath: string, zipPath: string) {
    if (seenZipPaths.has(zipPath)) return;
    seenZipPaths.add(zipPath);
    entries.push({ zipPath, diskPath });
  }

  for (const doc of params.documents) {
    const diskPath = resolveDocumentStoragePath(doc.fileUrl);
    if (!diskPath) continue;
    addEntry(diskPath, `files/documents/${path.basename(diskPath)}`);
  }

  for (const firearm of params.firearms) {
    if (firearm.imageSource !== "uploaded" || !firearm.imageUrl) continue;
    const diskPath = resolveImageStoragePath(firearm.imageUrl);
    if (!diskPath) continue;
    addEntry(diskPath, `files/images/firearms/${path.basename(diskPath)}`);
  }

  for (const accessory of params.accessories) {
    if (accessory.imageSource !== "uploaded" || !accessory.imageUrl) continue;
    const diskPath = resolveImageStoragePath(accessory.imageUrl);
    if (!diskPath) continue;
    addEntry(diskPath, `files/images/accessories/${path.basename(diskPath)}`);
  }

  return entries;
}

export async function readBackupFiles(
  entries: BackupFileEntry[]
): Promise<{ found: Array<BackupFileEntry & { buffer: Buffer }>; missing: BackupFileEntry[] }> {
  const found: Array<BackupFileEntry & { buffer: Buffer }> = [];
  const missing: BackupFileEntry[] = [];

  for (const entry of entries) {
    try {
      const buffer = await fs.readFile(entry.diskPath);
      found.push({ ...entry, buffer });
    } catch {
      missing.push(entry);
    }
  }

  return { found, missing };
}

// Inverse of collectBackupFileEntries's zipPath shape — validates a path from
// inside an uploaded backup zip and resolves where it should be written back
// to on disk (under the same canonical uploads root used for reads/writes
// elsewhere), rejecting anything outside "files/<kind>/<...segments>".
export function resolveBackupFileWritePath(zipPath: string): string | null {
  if (!zipPath.startsWith("files/")) return null;
  const segments = zipPath.slice("files/".length).split("/").filter(Boolean);
  if (segments.length < 2 || !segments.every((seg) => SAFE_SEGMENT.test(seg))) return null;

  const uploadsRoot = getCanonicalUploadsRoot();
  const resolvedPath = path.resolve(uploadsRoot, ...segments);
  if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) return null;
  return resolvedPath;
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { deflateRawSync } from "node:zlib";

/* ------------------------------------------------------------------ */
/*  CRC-32 (standard IEEE table)                                      */
/* ------------------------------------------------------------------ */
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ */
/*  Minimal ZIP builder                                                */
/* ------------------------------------------------------------------ */
interface ZipEntry {
  name: Uint8Array;
  compressed: Uint8Array;
  uncompressed: Uint8Array;
  crc: number;
  offset: number;
}

function buildZip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [];
  let offset = 0;

  // ---------- 1. Prepare entries & compute total size ----------
  for (const [path, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(path);
    const rawBytes = encoder.encode(content);
    const compressed = deflateRawSync(rawBytes);
    const compressedBytes = new Uint8Array(
      compressed.buffer,
      compressed.byteOffset,
      compressed.byteLength
    );

    entries.push({
      name: nameBytes,
      compressed: compressedBytes,
      uncompressed: rawBytes,
      crc: crc32(rawBytes),
      offset,
    });

    // Local file header (30) + name + compressed data
    offset += 30 + nameBytes.length + compressedBytes.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const e of entries) {
    centralSize += 46 + e.name.length;
  }

  const totalSize = centralStart + centralSize + 22; // +22 for EOCD
  const buf = new Uint8Array(totalSize);
  const view = new DataView(buf.buffer);
  let pos = 0;

  // ---------- 2. Local file headers + data ----------
  for (const e of entries) {
    view.setUint32(pos, 0x04034b50, true); // Local file header signature
    view.setUint16(pos + 4, 20, true); // Version needed (2.0)
    view.setUint16(pos + 6, 0, true); // General purpose bit flag
    view.setUint16(pos + 8, 8, true); // Compression method: deflate
    view.setUint16(pos + 10, 0, true); // Last mod time
    view.setUint16(pos + 12, 0, true); // Last mod date
    view.setUint32(pos + 14, e.crc, true); // CRC-32
    view.setUint32(pos + 18, e.compressed.length, true); // Compressed size
    view.setUint32(pos + 22, e.uncompressed.length, true); // Uncompressed size
    view.setUint16(pos + 26, e.name.length, true); // Filename length
    view.setUint16(pos + 28, 0, true); // Extra field length
    buf.set(e.name, pos + 30);
    buf.set(e.compressed, pos + 30 + e.name.length);
    pos += 30 + e.name.length + e.compressed.length;
  }

  // ---------- 3. Central directory headers ----------
  for (const e of entries) {
    view.setUint32(pos, 0x02014b50, true); // Central directory signature
    view.setUint16(pos + 4, 20, true); // Version made by
    view.setUint16(pos + 6, 20, true); // Version needed
    view.setUint16(pos + 8, 0, true); // General purpose bit flag
    view.setUint16(pos + 10, 8, true); // Compression method: deflate
    view.setUint16(pos + 12, 0, true); // Last mod time
    view.setUint16(pos + 14, 0, true); // Last mod date
    view.setUint32(pos + 16, e.crc, true); // CRC-32
    view.setUint32(pos + 20, e.compressed.length, true); // Compressed size
    view.setUint32(pos + 24, e.uncompressed.length, true); // Uncompressed size
    view.setUint16(pos + 28, e.name.length, true); // Filename length
    view.setUint16(pos + 30, 0, true); // Extra field length
    view.setUint16(pos + 32, 0, true); // File comment length
    view.setUint16(pos + 34, 0, true); // Disk number start
    view.setUint16(pos + 36, 0, true); // Internal file attributes
    view.setUint32(pos + 38, 0, true); // External file attributes
    view.setUint32(pos + 42, e.offset, true); // Relative offset of local header
    buf.set(e.name, pos + 46);
    pos += 46 + e.name.length;
  }

  // ---------- 4. End of central directory ----------
  view.setUint32(pos, 0x06054b50, true); // EOCD signature
  view.setUint16(pos + 4, 0, true); // Disk number
  view.setUint16(pos + 6, 0, true); // Disk with central directory
  view.setUint16(pos + 8, entries.length, true); // Entries on this disk
  view.setUint16(pos + 10, entries.length, true); // Total entries
  view.setUint32(pos + 12, centralSize, true); // Central directory size
  view.setUint32(pos + 16, centralStart, true); // Central directory offset
  view.setUint16(pos + 20, 0, true); // Comment length

  return buf;
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ exportId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { exportId } = await params;

  if (!exportId || exportId.trim() === "") {
    return NextResponse.json(
      { error: "exportId is required" },
      { status: 400 }
    );
  }

  const specExport = await prisma.specExport.findUnique({
    where: { id: exportId },
    select: { userId: true, files: true, projectId: true },
  });

  if (!specExport) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (specExport.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: specExport.projectId },
    select: { name: true },
  });

  const projectName = project?.name ?? "project";
  const sanitized = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const files = specExport.files as Record<string, string>;

  // ---- Decide response format ----
  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  if (format === "json") {
    return NextResponse.json({ projectName: sanitized, files });
  }

  // ---- Default: ZIP ----
  const zipBytes = buildZip(files);

  return new Response(zipBytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${sanitized}-spec.zip"`,
      "Content-Length": String(zipBytes.byteLength),
    },
  });
}

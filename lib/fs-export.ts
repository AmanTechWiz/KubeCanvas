"use client";

// ---------------------------------------------------------------------------
// File System Access API – global type declarations
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?:
        | "desktop"
        | "documents"
        | "downloads"
        | "music"
        | "pictures"
        | "videos";
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------
export type GeneratedFile = {
  path: string; // e.g. ".ai-spec/SPEC.md" or ".ai-spec/architecture.json"
  content: string;
};

export type ExportProgress = {
  phase: "preparing" | "writing" | "complete" | "error";
  current: number;
  total: number;
  currentFile?: string;
  error?: string;
  savedPath?: string; // only on complete, the dir name
};

export type ExportResult = {
  success: boolean;
  filesWritten: number;
  filesFailed: string[];
  savedPath?: string;
};

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function"
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Recursively obtain (or create) a nested directory handle from a root,
 * following the segments in `parts`.
 */
async function getNestedDirectory(
  root: FileSystemDirectoryHandle,
  parts: string[],
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

// ---------------------------------------------------------------------------
// Main export – File System Access API
// ---------------------------------------------------------------------------
export async function writeProjectToDirectory(
  projectName: string,
  files: GeneratedFile[],
  onProgress?: (progress: ExportProgress) => void,
): Promise<ExportResult> {
  // --- Attempt to open directory picker --------------------------------
  let rootHandle: FileSystemDirectoryHandle;
  try {
    if (!window.showDirectoryPicker) {
      throw new Error("File System Access API is not supported");
    }
    rootHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (err: unknown) {
    // User cancelled the picker
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, filesWritten: 0, filesFailed: [] };
    }
    throw err;
  }

  const safeName = sanitizeProjectName(projectName);
  const projectDir = await rootHandle.getDirectoryHandle(safeName, {
    create: true,
  });

  const total = files.length;
  let filesWritten = 0;
  const filesFailed: string[] = [];

  onProgress?.({
    phase: "preparing",
    current: 0,
    total,
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const segments = file.path.split("/").filter(Boolean);
    const fileName = segments.pop()!;

    try {
      // Create intermediate directories
      const parentDir =
        segments.length > 0
          ? await getNestedDirectory(projectDir, segments)
          : projectDir;

      // Write file
      const fileHandle = await parentDir.getFileHandle(fileName, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(file.content);
      } finally {
        await writable.close();
      }

      filesWritten++;
    } catch (err: unknown) {
      filesFailed.push(file.path);
    }

    onProgress?.({
      phase: "writing",
      current: i + 1,
      total,
      currentFile: file.path,
    });
  }

  const success = filesFailed.length === 0;

  onProgress?.({
    phase: "complete",
    current: total,
    total,
    savedPath: safeName,
  });

  return {
    success,
    filesWritten,
    filesFailed,
    savedPath: safeName,
  };
}

// ---------------------------------------------------------------------------
// ZIP fallback – minimal manual ZIP builder (no dependencies)
// ---------------------------------------------------------------------------

/** Standard CRC-32 lookup table (IEEE / ISO 3309). */
function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const CRC32_TABLE = makeCrc32Table();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Encode a string to UTF-8 bytes. */
function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Write a 16-bit LE value into a DataView. */
function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

/** Write a 32-bit LE value into a DataView. */
function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

interface ZipEntry {
  pathBytes: Uint8Array;
  dataBytes: Uint8Array;
  crc: number;
  localHeaderOffset: number;
}

export async function downloadAsZip(
  projectName: string,
  files: GeneratedFile[],
): Promise<void> {
  const safeName = sanitizeProjectName(projectName);

  // Prepare entries ----------------------------------------------------------
  const entries: ZipEntry[] = files.map((f) => {
    const fullPath = `${safeName}/${f.path}`;
    const pathBytes = encodeUtf8(fullPath);
    const dataBytes = encodeUtf8(f.content);
    const crc = crc32(dataBytes);
    return { pathBytes, dataBytes, crc, localHeaderOffset: 0 };
  });

  // Compute sizes ------------------------------------------------------------
  const LOCAL_HEADER_FIXED = 30;
  const CENTRAL_HEADER_FIXED = 46;
  const EOCD_SIZE = 22;

  let localBlockSize = 0;
  for (const e of entries) {
    localBlockSize += LOCAL_HEADER_FIXED + e.pathBytes.length + e.dataBytes.length;
  }

  let centralBlockSize = 0;
  for (const e of entries) {
    centralBlockSize += CENTRAL_HEADER_FIXED + e.pathBytes.length;
  }

  const totalSize = localBlockSize + centralBlockSize + EOCD_SIZE;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Write local file headers + data ------------------------------------------
  let offset = 0;
  for (const entry of entries) {
    entry.localHeaderOffset = offset;
    const { pathBytes, dataBytes, crc } = entry;

    // Local file header signature
    writeU32(view, offset, 0x04034b50);
    // Version needed to extract (2.0)
    writeU16(view, offset + 4, 20);
    // General purpose bit flag
    writeU16(view, offset + 6, 0);
    // Compression method – STORED
    writeU16(view, offset + 8, 0);
    // Last mod file time
    writeU16(view, offset + 10, 0);
    // Last mod file date
    writeU16(view, offset + 12, 0);
    // CRC-32
    writeU32(view, offset + 14, crc);
    // Compressed size
    writeU32(view, offset + 18, dataBytes.length);
    // Uncompressed size
    writeU32(view, offset + 22, dataBytes.length);
    // File name length
    writeU16(view, offset + 26, pathBytes.length);
    // Extra field length
    writeU16(view, offset + 28, 0);

    offset += LOCAL_HEADER_FIXED;

    // File name
    bytes.set(pathBytes, offset);
    offset += pathBytes.length;

    // File data
    bytes.set(dataBytes, offset);
    offset += dataBytes.length;
  }

  // Write central directory --------------------------------------------------
  const centralDirOffset = offset;

  for (const entry of entries) {
    const { pathBytes, dataBytes, crc, localHeaderOffset } = entry;

    // Central directory header signature
    writeU32(view, offset, 0x02014b50);
    // Version made by (2.0)
    writeU16(view, offset + 4, 20);
    // Version needed to extract (2.0)
    writeU16(view, offset + 6, 20);
    // General purpose bit flag
    writeU16(view, offset + 8, 0);
    // Compression method – STORED
    writeU16(view, offset + 10, 0);
    // Last mod file time
    writeU16(view, offset + 12, 0);
    // Last mod file date
    writeU16(view, offset + 14, 0);
    // CRC-32
    writeU32(view, offset + 16, crc);
    // Compressed size
    writeU32(view, offset + 20, dataBytes.length);
    // Uncompressed size
    writeU32(view, offset + 24, dataBytes.length);
    // File name length
    writeU16(view, offset + 28, pathBytes.length);
    // Extra field length
    writeU16(view, offset + 30, 0);
    // File comment length
    writeU16(view, offset + 32, 0);
    // Disk number start
    writeU16(view, offset + 34, 0);
    // Internal file attributes
    writeU16(view, offset + 36, 0);
    // External file attributes
    writeU32(view, offset + 38, 0);
    // Relative offset of local header
    writeU32(view, offset + 42, localHeaderOffset);

    offset += CENTRAL_HEADER_FIXED;

    // File name
    bytes.set(pathBytes, offset);
    offset += pathBytes.length;
  }

  // Write end of central directory record ------------------------------------
  // Signature
  writeU32(view, offset, 0x06054b50);
  // Number of this disk
  writeU16(view, offset + 4, 0);
  // Disk where central directory starts
  writeU16(view, offset + 6, 0);
  // Number of central directory records on this disk
  writeU16(view, offset + 8, entries.length);
  // Total number of central directory records
  writeU16(view, offset + 10, entries.length);
  // Size of central directory
  writeU32(view, offset + 12, centralBlockSize);
  // Offset of start of central directory
  writeU32(view, offset + 16, centralDirOffset);
  // Comment length
  writeU16(view, offset + 20, 0);

  // Trigger download ---------------------------------------------------------
  const blob = new Blob([buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}.zip`;
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ZipArchive } from "archiver";
import { PassThrough } from "stream";

/**
 * GET — Download a spec export as a ZIP file.
 *
 * Reads the SpecExport record from DB, assembles a ZIP with the
 * .ai-spec/ directory structure, and streams it to the client.
 */
export async function GET(
  _request: Request,
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

  // Fetch the spec export
  const specExport = await prisma.specExport.findUnique({
    where: { id: exportId },
    select: { userId: true, files: true, projectId: true },
  });

  if (!specExport) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify ownership
  if (specExport.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get project name for the ZIP filename
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

  // Create a PassThrough stream for the ZIP
  const passThrough = new PassThrough();
  const archive = new ZipArchive();

  // Pipe archive output to the PassThrough stream
  archive.pipe(passThrough);

  // Add each file to the archive under .ai-spec/
  const fileOrder = [
    "architecture.json",
    "SPEC.md",
    "IMPLEMENTATION_PLAN.md",
    "IMPLEMENTATION_QUESTIONS.md",
    "IMPLEMENTATION_GUARDRAILS.md",
  ];

  for (const fileName of fileOrder) {
    const content = files[fileName];
    if (content) {
      archive.append(content, { name: `.ai-spec/${fileName}` });
    }
  }

  // Also add any extra files that might be in the record
  for (const [fileName, content] of Object.entries(files)) {
    if (!fileOrder.includes(fileName) && typeof content === "string") {
      archive.append(content, { name: `.ai-spec/${fileName}` });
    }
  }

  // Finalize the archive
  archive.finalize();

  // Convert the PassThrough stream to a ReadableStream for Next.js
  const readable = new ReadableStream({
    start(controller) {
      passThrough.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      passThrough.on("end", () => {
        controller.close();
      });
      passThrough.on("error", (err) => {
        controller.error(err);
      });
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ai-spec-${sanitized}.zip"`,
    },
  });
}

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

/**
 * Verify the current user has project access (owner or collaborator).
 * Returns the project record if authorized, null otherwise.
 */
async function requireProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, canvasJsonPath: true },
  });

  if (!project) return null;

  if (project.ownerId === userId) return project;

  const user = await (await clerkClient()).users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) return null;

  const collaborator = await prisma.projectCollaborator.findUnique({
    where: { projectId_email: { projectId, email } },
  });

  return collaborator ? project : null;
}

/**
 * PUT — Save canvas JSON to Vercel Blob, store the blob URL on the project.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await requireProjectAccess(projectId, userId);
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const canvasJson = body.canvasJson;

  if (!canvasJson || typeof canvasJson !== "object") {
    return NextResponse.json(
      { error: "canvasJson is required" },
      { status: 400 },
    );
  }

  // Upload canvas JSON to Vercel Blob (allowOverwrite handles re-saves)
  const blob = await put(`canvas/${projectId}.json`, JSON.stringify(canvasJson), {
    contentType: "application/json",
    access: "private",
    allowOverwrite: true,
  });

  // Store the blob URL on the project record
  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJsonPath: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}

/**
 * GET — Load saved canvas JSON from Vercel Blob.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await requireProjectAccess(projectId, userId);
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!project.canvasJsonPath) {
    return NextResponse.json({ canvasJson: null });
  }

  try {
    const response = await fetch(project.canvasJsonPath);
    if (!response.ok) {
      return NextResponse.json({ canvasJson: null });
    }
    const canvasJson = await response.json();
    return NextResponse.json({ canvasJson });
  } catch {
    return NextResponse.json({ canvasJson: null });
  }
}

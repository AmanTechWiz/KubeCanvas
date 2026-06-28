import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Verify the current user has project access (owner or collaborator).
 * Returns the project record if authorized, null otherwise.
 */
async function requireProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, canvasJson: true },
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
 * PUT — Save canvas JSON directly to the database.
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

  // Store canvas JSON directly in the database
  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJson },
  });

  return NextResponse.json({ ok: true });
}

/**
 * GET — Load saved canvas JSON directly from the database.
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

  return NextResponse.json({ canvasJson: project.canvasJson ?? null });
}

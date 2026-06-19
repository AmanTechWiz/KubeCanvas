import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * GET — List collaborators for a project.
 * Any authenticated user with project access (owner or collaborator) can view.
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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify access: owner or collaborator
  if (project.ownerId !== userId) {
    const currentUser = await (await clerkClient()).users.getUser(userId);
    const email = currentUser.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const collaborator = await prisma.projectCollaborator.findUnique({
      where: { projectId_email: { projectId, email } },
    });
    if (!collaborator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  // Enrich with Clerk user data
  const client = await clerkClient();

  // Fetch owner info
  let ownerName = "Unknown"
  let ownerEmail = ""
  let ownerAvatarUrl: string | null = null
  try {
    const owner = await client.users.getUser(project.ownerId)
    ownerName = owner.fullName ?? owner.emailAddresses[0]?.emailAddress ?? "Unknown"
    ownerEmail = owner.emailAddresses[0]?.emailAddress ?? ""
    ownerAvatarUrl = owner.imageUrl ?? null
  } catch {
    // Fallback if Clerk lookup fails
  }

  const enriched = await Promise.all(
    collaborators.map(async (collab) => {
      try {
        const userList = await client.users.getUserList({
          emailAddress: [collab.email],
        });
        const user = userList.data[0];

        return {
          id: collab.id,
          email: collab.email,
          name: user?.fullName ?? collab.email,
          avatarUrl: user?.imageUrl ?? null,
          createdAt: collab.createdAt.toISOString(),
        };
      } catch {
        return {
          id: collab.id,
          email: collab.email,
          name: collab.email,
          avatarUrl: null,
          createdAt: collab.createdAt.toISOString(),
        };
      }
    }),
  );

  return NextResponse.json({
    collaborators: enriched,
    owner: {
      name: ownerName,
      email: ownerEmail,
      avatarUrl: ownerAvatarUrl,
    },
  });
}

/**
 * POST — Invite a collaborator by email (owner only).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Don't allow adding yourself
  const currentUser = await (await clerkClient()).users.getUser(userId);
  const currentEmail = currentUser.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (email === currentEmail) {
    return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  // Upsert — idempotent
  const collaborator = await prisma.projectCollaborator.upsert({
    where: {
      projectId_email: { projectId, email },
    },
    create: { projectId, email },
    update: {},
  });

  return NextResponse.json({ collaborator }, { status: 201 });
}

/**
 * DELETE — Remove a collaborator (owner only).
 * Body: { collaboratorId: string }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { collaboratorId } = body;

  if (typeof collaboratorId !== "string") {
    return NextResponse.json({ error: "Missing collaboratorId" }, { status: 400 });
  }

  // Verify the collaborator belongs to this project
  const collaborator = await prisma.projectCollaborator.findFirst({
    where: { id: collaboratorId, projectId },
  });

  if (!collaborator) {
    return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
  }

  await prisma.projectCollaborator.delete({
    where: { id: collaboratorId },
  });

  return new NextResponse(null, { status: 204 });
}

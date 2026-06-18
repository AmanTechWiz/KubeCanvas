import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Project } from "@/app/generated/prisma/client";

export interface ProjectAccess {
  userId: string;
  email: string;
  project: Project;
  isOwner: boolean;
}

/**
 * Get the current Clerk identity (userId + primary email).
 * Returns null if unauthenticated.
 */
export async function getCurrentIdentity(): Promise<{
  userId: string;
  email: string;
} | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";

  return { userId, email };
}

/**
 * Check project access by owner or collaborator.
 * Returns ProjectAccess if authorized, null otherwise.
 */
export async function checkProjectAccess(
  projectIdOrSlug: string
): Promise<ProjectAccess | null> {
  const identity = await getCurrentIdentity();
  if (!identity) return null;

  const { userId, email } = identity;

  // Try to find by ID first, then by slug
  const project = await prisma.project.findFirst({
    where: {
      OR: [{ id: projectIdOrSlug }, { slug: projectIdOrSlug }],
    },
  });

  if (!project) return null;

  // Check ownership
  if (project.ownerId === userId) {
    return { userId, email, project, isOwner: true };
  }

  // Check collaborator access
  const collaborator = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_email: { projectId: project.id, email },
    },
  });

  if (!collaborator) return null;

  return { userId, email, project, isOwner: false };
}

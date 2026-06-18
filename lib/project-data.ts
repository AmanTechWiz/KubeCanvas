import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { ProjectData, SharedProjectData } from "@/lib/project-types";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getProjects(): Promise<{
  userId: string;
  ownedProjects: ProjectData[];
  sharedProjects: SharedProjectData[];
}> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.projectCollaborator.findMany({
      where: { email: userId },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const ownedProjects: ProjectData[] = owned.map((p) => ({
    id: p.id,
    name: p.name,
    slug: generateSlug(p.name),
    ownerId: p.ownerId,
    createdAt: p.createdAt.toISOString(),
  }));

  const sharedProjects: SharedProjectData[] = shared.map((sc) => ({
    id: sc.project.id,
    name: sc.project.name,
    slug: generateSlug(sc.project.name),
    ownerId: sc.project.ownerId,
    createdAt: sc.project.createdAt.toISOString(),
    sharedBy: sc.email,
  }));

  return { userId, ownedProjects, sharedProjects };
}

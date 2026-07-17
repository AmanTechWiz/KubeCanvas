import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import type { generateAiSpec } from "@/trigger/generate-ai-spec";

/**
 * POST — Trigger a background AI spec export task.
 *
 * Accepts: { projectId: string }
 * Reads current canvas state from DB, triggers parallel Gemini generation,
 * returns a runId for realtime progress tracking.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, description } = body;

  if (typeof projectId !== "string" || projectId.trim() === "") {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, canvasJson: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only owner can export spec
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check canvas has content
  const canvasJson = project.canvasJson as any;
  const nodeCount = Array.isArray(canvasJson?.nodes) ? canvasJson.nodes.length : 0;
  if (nodeCount === 0) {
    return NextResponse.json(
      { error: "Canvas is empty — add some architecture components before exporting" },
      { status: 400 }
    );
  }

  // Persist the description so it pre-fills next time
  if (typeof description === "string") {
    await prisma.project.update({
      where: { id: projectId },
      data: { description: description.trim() || null },
    });
  }

  // Trigger the spec generation task
  const handle = await tasks.trigger<typeof generateAiSpec>("generate-ai-spec", {
    projectId,
    userId,
    ...(typeof description === "string" && description.trim() && { projectDescription: description.trim() }),
  });

  // Create a TaskRun record for ownership verification on token endpoint
  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId,
      userId,
    },
  });

  console.log(
    `[Export Spec] Triggered task for project ${projectId}, run ${handle.id}`
  );

  return NextResponse.json({ runId: handle.id });
}

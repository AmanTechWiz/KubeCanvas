import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";
import type { designAgent } from "@/trigger/design-agent";

/**
 * POST — Trigger a background design generation task.
 *
 * Accepts: { prompt: string, projectId: string }
 * Reads current canvas state from DB and passes it to the agent for diff-based modification.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { prompt, projectId } = body;

  if (typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json(
      { error: "prompt is required" },
      { status: 400 },
    );
  }

  if (typeof projectId !== "string" || projectId.trim() === "") {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  // Verify project access (owner or collaborator)
  const access = await checkProjectAccess(projectId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, canvasJson: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Read current canvas state for diff-based modification
  const canvasJson = project.canvasJson as any;
  const rawNodes = Array.isArray(canvasJson?.nodes) ? canvasJson.nodes : [];
  const rawEdges = Array.isArray(canvasJson?.edges) ? canvasJson.edges : [];

  const currentNodes = rawNodes.map((n: any) => ({
    id: n.id ?? "",
    label: n.data?.label ?? n.label ?? "",
    shape: n.data?.shape ?? "rectangle",
    color: n.data?.color ?? "#1F1F1F",
    logo: n.data?.logo ?? null,
  }));

  const currentEdges = rawEdges.map((e: any) => ({
    id: e.id ?? "",
    source: e.source ?? "",
    target: e.target ?? "",
    label: e.label ?? null,
  }));

  // Trigger the design task
  const handle = await tasks.trigger<typeof designAgent>("design-agent", {
    prompt: prompt.trim(),
    roomId: projectId,
    projectId,
    currentArchitecture:
      currentNodes.length > 0 || currentEdges.length > 0
        ? { nodes: currentNodes, edges: currentEdges }
        : undefined,
  });

  // Persist the task run for ownership tracking
  const taskRun = await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId,
      userId,
    },
  });

  return NextResponse.json(
    {
      runId: taskRun.runId,
      triggerDevRunId: handle.id,
      previousCanvasJson: canvasJson ?? { nodes: [], edges: [] },
    },
    { status: 201 },
  );
}

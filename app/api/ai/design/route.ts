import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { Liveblocks } from "@liveblocks/node";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";
import type { designAgent } from "@/trigger/design-agent";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

/**
 * Reads the LIVE canvas from the Liveblocks room (not the debounced
 * autosave in Postgres) so diffs and revert snapshots are never stale.
 * Falls back to the persisted canvasJson if the room has no storage yet.
 */
async function readLiveCanvas(
  roomId: string,
  prismaFallback: any,
): Promise<{ nodes: any[]; edges: any[] }> {
  try {
    const doc = (await liveblocks.getStorageDocument(roomId, "json")) as any;
    const flow = doc?.flow;
    if (flow && flow.nodes) {
      const rawNodes = Object.values(flow.nodes) as any[];
      const rawEdges = flow.edges ? (Object.values(flow.edges) as any[]) : [];
      return {
        nodes: rawNodes.map((n: any) => ({
          id: n.id ?? "",
          type: n.type ?? "canvasNode",
          position: n.position ?? { x: 0, y: 0 },
          width: n.width ?? null,
          height: n.height ?? null,
          data: n.data ?? {},
        })),
        edges: rawEdges.map((e: any) => ({
          id: e.id ?? "",
          type: e.type ?? "canvasEdge",
          source: e.source ?? "",
          target: e.target ?? "",
          sourceHandle: e.sourceHandle ?? null,
          targetHandle: e.targetHandle ?? null,
          label: e.label ?? null,
          data: e.data ?? {},
        })),
      };
    }
  } catch (err) {
    console.warn("[AI Design] Live storage read failed, using DB fallback:", err);
  }

  const rawNodes = Array.isArray(prismaFallback?.nodes) ? prismaFallback.nodes : [];
  const rawEdges = Array.isArray(prismaFallback?.edges) ? prismaFallback.edges : [];
  return { nodes: rawNodes, edges: rawEdges };
}

/**
 * POST — Trigger a background design generation task.
 *
 * Accepts: { prompt: string, projectId: string }
 * Reads live canvas state from the Liveblocks room (DB fallback) and
 * passes it to the agent for diff-based modification + revert snapshot.
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

  // Read current canvas state — live from the Liveblocks room so
  // diff-based modification and the revert snapshot are never stale
  // (the DB canvasJson lags behind by the autosave debounce).
  const canvasJson = await readLiveCanvas(projectId, project.canvasJson);

  const currentNodes = canvasJson.nodes.map((n: any) => ({
    id: n.id ?? "",
    label: n.data?.label ?? n.label ?? "",
    shape: n.data?.shape ?? "rectangle",
    color: n.data?.color ?? "#1F1F1F",
    logo: n.data?.logo ?? null,
  }));

  const currentEdges = canvasJson.edges.map((e: any) => ({
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

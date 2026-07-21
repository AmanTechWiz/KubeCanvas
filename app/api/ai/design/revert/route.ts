import { NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { checkProjectAccess } from "@/lib/project-access";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

/**
 * POST — Revert canvas to a previous state after a cancelled design agent run.
 *
 * Accepts: { projectId: string, previousCanvasJson: { nodes: any[], edges: any[] } }
 * Clears the current canvas and restores the previous nodes/edges.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { projectId, previousCanvasJson } = body;

  if (typeof projectId !== "string" || projectId.trim() === "") {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  if (!previousCanvasJson) {
    return NextResponse.json(
      { error: "previousCanvasJson is required" },
      { status: 400 }
    );
  }

  // Verify project access (owner or collaborator)
  const access = await checkProjectAccess(projectId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roomId = projectId;
  const prevNodes = Array.isArray(previousCanvasJson.nodes)
    ? previousCanvasJson.nodes
    : [];
  const prevEdges = Array.isArray(previousCanvasJson.edges)
    ? previousCanvasJson.edges
    : [];

  try {
    // Clear agent cursor and thinking state FIRST
    await liveblocks.mutateStorage(roomId, async ({ root }) => {
      root.set("agentThinking", false);
      root.set("agentCursor", null);
    });

    // Clear current canvas
    await mutateFlow({ client: liveblocks, roomId }, (flow) => {
      for (const n of flow.nodes) flow.removeNode(n.id);
      for (const e of flow.edges) flow.removeEdge(e.id);
    });

    // Restore previous nodes
    if (prevNodes.length > 0) {
      await mutateFlow({ client: liveblocks, roomId }, (flow) => {
        for (const node of prevNodes) {
          flow.addNode({
            id: node.id,
            type: node.type ?? "canvasNode",
            position: node.position ?? { x: 0, y: 0 },
            data: node.data ?? {},
            ...(node.width ? { width: node.width } : {}),
            ...(node.height ? { height: node.height } : {}),
          } as any);
        }
      });
    }

    // Restore previous edges
    if (prevEdges.length > 0) {
      await mutateFlow({ client: liveblocks, roomId }, (flow) => {
        for (const edge of prevEdges) {
          flow.addEdge({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type ?? "canvasEdge",
            ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
            ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
            data: edge.data ?? {},
            ...(edge.label ? { label: edge.label } : {}),
          } as any);
        }
      });
    }

    // (Agent cursor already cleared at the start)

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Revert] Failed to revert canvas:", error);
    return NextResponse.json(
      { error: "Failed to revert canvas" },
      { status: 500 }
    );
  }
}

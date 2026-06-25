import { task, logger, metadata } from "@trigger.dev/sdk";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { Liveblocks } from "@liveblocks/node";
import { SYSTEM_PROMPT } from "./ai_system_prompt";

// ── Clients ─────────────────────────────────────────────────────────

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// ── Constants ───────────────────────────────────────────────────────

const LIVEBLOCKS_API = "https://api.liveblocks.io/v2";
const AI_AGENT_ID = "ai-agent";
const GEMINI_MODEL = process.env.GEMINI_MODEL!;

// ── Gemini Provider ─────────────────────────────────────────────────

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI__API_KEY!,
});

// ── Zod Schemas ─────────────────────────────────────────────────────

const AddNodeAction = z.object({
  type: z.literal("addNode"),
  id: z.string().describe("Unique node ID (e.g. 'node-1', 'node-2')"),
  label: z.string().describe("Human-readable label for the node"),
  shape: z.enum(["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"]),
  color: z.string().describe("Background color hex from the palette"),
  textColor: z.string().describe("Text color hex matching the background"),
  x: z.number().describe("X position on the canvas"),
  y: z.number().describe("Y position on the canvas"),
  width: z.number().describe("Node width in pixels"),
  height: z.number().describe("Node height in pixels"),
});

const AddEdgeAction = z.object({
  type: z.literal("addEdge"),
  id: z.string().describe("Unique edge ID (e.g. 'edge-1')"),
  source: z.string().describe("Source node ID"),
  target: z.string().describe("Target node ID"),
  sourceHandle: z.string().describe("Source handle (e.g. 'bottom-source', 'right-source')"),
  targetHandle: z.string().describe("Target handle (e.g. 'top-target', 'left-target')"),
  label: z.string().optional().describe("Optional edge label describing the relationship"),
});

const UpdateNodeAction = z.object({
  type: z.literal("updateNode"),
  id: z.string().describe("ID of the node to update"),
  label: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  color: z.string().optional(),
  textColor: z.string().optional(),
  shape: z.string().optional(),
});

const DeleteNodeAction = z.object({
  type: z.literal("deleteNode"),
  id: z.string().describe("ID of the node to delete"),
});

const DeleteEdgeAction = z.object({
  type: z.literal("deleteEdge"),
  id: z.string().describe("ID of the edge to delete"),
});

const ActionSchema = z.union([
  AddNodeAction,
  AddEdgeAction,
  UpdateNodeAction,
  DeleteNodeAction,
  DeleteEdgeAction,
]);

const DesignOutputSchema = z.object({
  thinking: z
    .string()
    .describe(
      "Brief description of your design approach and reasoning (1-2 sentences)",
    ),
  actions: z
    .array(ActionSchema)
    .describe("Ordered list of canvas operations to execute"),
});

type DesignOutput = z.infer<typeof DesignOutputSchema>;

// ── System Prompt loaded from ./ai_system_prompt.ts ────────────────

// ── Room Helpers ───────────────────────────────────────────────────

/**
 * Ensure the Liveblocks room exists before reading/writing.
 * The room ID must be the Prisma project cuid (same ID the frontend uses).
 */
async function ensureRoomExists(roomId: string): Promise<void> {
  try {
    await liveblocks.getOrCreateRoom(roomId, {
      defaultAccesses: [], // Private room — access via ID tokens
    });
    logger.info("Liveblocks room ensured", { roomId });
  } catch (err) {
    logger.error("Failed to ensure Liveblocks room", {
      roomId,
      error: String(err),
    });
    throw new Error(
      `Could not create/access Liveblocks room "${roomId}": ${String(err)}`,
    );
  }
}

// ── Liveblocks Helpers ──────────────────────────────────────────────

function liveblocksHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY!}`,
    "Content-Type": "application/json",
  };
}

async function setAiPresence(
  roomId: string,
  isThinking: boolean,
  ttl: number = 300,
): Promise<void> {
  try {
    const res = await fetch(`${LIVEBLOCKS_API}/rooms/${roomId}/presence`, {
      method: "POST",
      headers: liveblocksHeaders(),
      body: JSON.stringify({
        userId: AI_AGENT_ID,
        data: { cursor: null, isThinking },
        userInfo: {
          name: "KubeAI",
          color: "#6457f9",
        },
        ttl,
      }),
    });
    if (!res.ok) {
      logger.warn("Failed to set AI presence", { status: res.status });
    }
  } catch (err) {
    logger.warn("Failed to set AI presence", { error: String(err) });
  }
}

async function clearAiPresence(roomId: string): Promise<void> {
  try {
    const res = await fetch(`${LIVEBLOCKS_API}/rooms/${roomId}/presence`, {
      method: "POST",
      headers: liveblocksHeaders(),
      body: JSON.stringify({
        userId: AI_AGENT_ID,
        data: { cursor: null, isThinking: false },
        ttl: 5,
      }),
    });
    if (!res.ok) {
      logger.warn("Failed to clear AI presence", { status: res.status });
    }
  } catch (err) {
    logger.warn("Failed to clear AI presence", { error: String(err) });
  }
}

interface CanvasNodeSummary {
  id: string;
  label: string;
  shape: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasEdgeSummary {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface CanvasState {
  nodes: CanvasNodeSummary[];
  edges: CanvasEdgeSummary[];
}

async function readCanvasState(roomId: string): Promise<CanvasState> {
  try {
    const res = await fetch(`${LIVEBLOCKS_API}/rooms/${roomId}/storage`, {
      headers: liveblocksHeaders(),
    });

    if (!res.ok) {
      logger.warn("Failed to read canvas state", { status: res.status });
      return { nodes: [], edges: [] };
    }

    const json = await res.json();
    const flow = json?.data?.flow ?? {};
    const nodesMap = flow.nodes ?? {};
    const edgesMap = flow.edges ?? {};

    const nodes: CanvasNodeSummary[] = Object.entries(nodesMap).map(
      ([id, node]: [string, any]) => ({
        id,
        label: node.data?.label ?? "",
        shape: node.data?.shape ?? "rectangle",
        color: node.data?.color ?? "#1F1F1F",
        x: node.position?.x ?? 0,
        y: node.position?.y ?? 0,
        width: node.width ?? 192,
        height: node.height ?? 128,
      }),
    );

    const edges: CanvasEdgeSummary[] = Object.entries(edgesMap).map(
      ([id, edge]: [string, any]) => ({
        id,
        source: edge.source ?? "",
        target: edge.target ?? "",
        label: edge.data?.label ?? "",
      }),
    );

    return { nodes, edges };
  } catch (err) {
    logger.warn("Failed to read canvas state", { error: String(err) });
    return { nodes: [], edges: [] };
  }
}

async function applyJsonPatch(
  roomId: string,
  operations: object[],
): Promise<void> {
  if (operations.length === 0) {
    logger.info("No operations to apply");
    return;
  }

  const res = await fetch(
    `${LIVEBLOCKS_API}/rooms/${roomId}/storage/json-patch`,
    {
      method: "PATCH",
      headers: liveblocksHeaders(),
      body: JSON.stringify(operations),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    logger.error("JSON Patch failed", { status: res.status, body });
    throw new Error(`Failed to apply canvas changes (${res.status}): ${body}`);
  }
}

// ── Action → JSON Patch Conversion ──────────────────────────────────

function actionsToPatchOps(
  actions: DesignOutput["actions"],
  existingNodeIds: Set<string>,
): { ops: object[]; warnings: string[] } {
  const ops: object[] = [];
  const warnings: string[] = [];

  for (const action of actions) {
    switch (action.type) {
      case "addNode": {
        if (existingNodeIds.has(action.id)) {
          warnings.push(`Skipping addNode "${action.id}" — ID already exists`);
          continue;
        }
        existingNodeIds.add(action.id);
        ops.push({
          op: "add",
          path: `/flow/nodes/${action.id}`,
          value: {
            id: action.id,
            type: "canvasNode",
            position: { x: action.x, y: action.y },
            width: action.width,
            height: action.height,
            data: {
              label: action.label,
              color: action.color,
              textColor: action.textColor,
              shape: action.shape,
            },
            selected: false,
            dragging: false,
          },
        });
        break;
      }

      case "addEdge": {
        if (!existingNodeIds.has(action.source)) {
          warnings.push(
            `Skipping addEdge "${action.id}" — source "${action.source}" not found`,
          );
          continue;
        }
        if (!existingNodeIds.has(action.target)) {
          warnings.push(
            `Skipping addEdge "${action.id}" — target "${action.target}" not found`,
          );
          continue;
        }
        ops.push({
          op: "add",
          path: `/flow/edges/${action.id}`,
          value: {
            id: action.id,
            source: action.source,
            target: action.target,
            sourceHandle: action.sourceHandle,
            targetHandle: action.targetHandle,
            ...(action.label ? { data: { label: action.label } } : {}),
          },
        });
        break;
      }

      case "updateNode": {
        if (!existingNodeIds.has(action.id)) {
          warnings.push(
            `Skipping updateNode "${action.id}" — node not found`,
          );
          continue;
        }
        if (action.x !== undefined || action.y !== undefined) {
          ops.push({
            op: "replace",
            path: `/flow/nodes/${action.id}/position`,
            value: { x: action.x ?? 0, y: action.y ?? 0 },
          });
        }
        if (action.label !== undefined) {
          ops.push({
            op: "replace",
            path: `/flow/nodes/${action.id}/data/label`,
            value: action.label,
          });
        }
        if (action.width !== undefined) {
          ops.push({
            op: "replace",
            path: `/flow/nodes/${action.id}/width`,
            value: action.width,
          });
        }
        if (action.height !== undefined) {
          ops.push({
            op: "replace",
            path: `/flow/nodes/${action.id}/height`,
            value: action.height,
          });
        }
        if (action.color !== undefined) {
          ops.push({
            op: "replace",
            path: `/flow/nodes/${action.id}/data/color`,
            value: action.color,
          });
        }
        if (action.textColor !== undefined) {
          ops.push({
            op: "replace",
            path: `/flow/nodes/${action.id}/data/textColor`,
            value: action.textColor,
          });
        }
        if (action.shape !== undefined) {
          ops.push({
            op: "replace",
            path: `/flow/nodes/${action.id}/data/shape`,
            value: action.shape,
          });
        }
        break;
      }

      case "deleteNode": {
        if (!existingNodeIds.has(action.id)) {
          warnings.push(
            `Skipping deleteNode "${action.id}" — node not found`,
          );
          continue;
        }
        existingNodeIds.delete(action.id);
        ops.push({
          op: "remove",
          path: `/flow/nodes/${action.id}`,
        });
        break;
      }

      case "deleteEdge": {
        ops.push({
          op: "remove",
          path: `/flow/edges/${action.id}`,
        });
        break;
      }
    }
  }

  return { ops, warnings };
}

// ── Main Task ───────────────────────────────────────────────────────

export const designTask = task({
  id: "design-agent",
  maxDuration: 300,
  run: async (payload: { prompt: string; projectId: string }) => {
    const { prompt, projectId } = payload;

    logger.info("Design task started", { prompt, projectId });

    // Ensure the Liveblocks room exists (creates it if first run)
    await ensureRoomExists(projectId);

    // Step 1 — Signal AI presence (thinking)
    await setAiPresence(projectId, true, 300);

    try {
      // Step 2 — Read current canvas state
      metadata.set("phase", "reading");
      logger.info("Reading canvas state", { projectId });
      const canvasState = await readCanvasState(projectId);
      logger.info("Canvas state loaded", {
        nodeCount: canvasState.nodes.length,
        edgeCount: canvasState.edges.length,
      });

      // Step 3 — Generate design with Gemini
      metadata.set("phase", "generating");
      logger.info("Generating design with Gemini");
      const { output: design } = await generateText({
        model: googleProvider(GEMINI_MODEL),
        output: Output.object({
          name: "KubeDesign",
          description: "A system architecture designer with canvas operations",
          schema: DesignOutputSchema,
        }),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `User request: ${prompt}\n\nCurrent canvas state:\n${JSON.stringify(canvasState, null, 2)}\n\n${canvasState.nodes.length === 0 ? "The canvas is empty — create a new design from scratch." : "Extend or modify the existing design as appropriate."}`,
          },
        ],
        temperature: 0.7,
      });

      logger.info("Design generated", {
        thinking: design.thinking,
        actionCount: design.actions.length,
      });

      // Step 4 — Convert actions to JSON Patch operations
      metadata.set("phase", "patching");
      const existingNodeIds = new Set(canvasState.nodes.map((n) => n.id));
      const { ops, warnings } = actionsToPatchOps(design.actions, existingNodeIds);

      if (warnings.length > 0) {
        logger.warn("Some actions were skipped", { warnings });
      }

      // Step 5 — Apply changes to canvas
      metadata.set("phase", "applying");
      logger.info("Applying patch to canvas", { opCount: ops.length });
      await applyJsonPatch(projectId, ops);
      logger.info("Canvas updated successfully");

      // Step 6 — Clear AI presence (short TTL for fade-out)
      await clearAiPresence(projectId);

      const nodeCount = design.actions.filter((a) => a.type === "addNode").length;
      const edgeCount = design.actions.filter((a) => a.type === "addEdge").length;

      logger.info("Design task completed", {
        nodesAdded: nodeCount,
        edgesAdded: edgeCount,
      });

      metadata.set("phase", "complete");

      return {
        status: "completed" as const,
        thinking: design.thinking,
        nodesAdded: nodeCount,
        edgesAdded: edgeCount,
        warnings,
      };
    } catch (error) {
      logger.error("Design task failed", { error: String(error) });

      // Clear AI presence on error
      await clearAiPresence(projectId);

      throw error;
    }
  },
});

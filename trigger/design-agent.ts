import { task, logger, metadata } from "@trigger.dev/sdk";
import { generateText, tool, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { Liveblocks } from "@liveblocks/node";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { SYSTEM_PROMPT } from "./ai_system_prompt";
import {
  NODE_COLORS,
  DEFAULT_NODE_COLOR,
  textColorForBg,
  type NodeShape,
} from "../types/canvas";

// ── Clients ─────────────────────────────────────────────────────────

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// ── Constants ───────────────────────────────────────────────────────

const LIVEBLOCKS_API = "https://api.liveblocks.io/v2";
const AI_AGENT_ID = "ai-agent";
const GEMINI_MODEL = process.env.GEMINI_MODEL!;
const FLOWCHART_STORAGE_KEY = "flow";

// ── Gemini Provider ─────────────────────────────────────────────────

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI__API_KEY!,
});

// ── Shared Zod Schemas ──────────────────────────────────────────────

const BLOCK_SHAPES: NodeShape[] = ["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"];

const BLOCK_COLORS = Object.fromEntries(
  NODE_COLORS.map((c) => [c.label.toLowerCase(), c])
) as Record<string, (typeof NODE_COLORS)[number]>;

const pointSchema = z.object({ x: z.number(), y: z.number() });
const sizeSchema = z.number().min(60).max(400);

// ── Presence Helpers ────────────────────────────────────────────────

let lastCursor: { x: number; y: number } | null = null;
let lastThinking: boolean = true;

function liveblocksHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY!}`,
    "Content-Type": "application/json",
  };
}

async function setPresence(
  roomId: string,
  data: { agentCursor?: { x: number; y: number } | null; isThinking?: boolean },
  ttl: number = 300,
) {
  try {
    await fetch(`${LIVEBLOCKS_API}/rooms/${roomId}/presence`, {
      method: "POST",
      headers: liveblocksHeaders(),
      body: JSON.stringify({
        userId: AI_AGENT_ID,
        data: {
          agentCursor: data.agentCursor ?? lastCursor,
          isThinking: data.isThinking ?? lastThinking,
          cursor: null,
        },
        userInfo: { name: "KubeAI", color: "#6457f9" },
        ttl,
      }),
    });
    if (data.agentCursor !== undefined) lastCursor = data.agentCursor ?? lastCursor;
    if (data.isThinking !== undefined) lastThinking = data.isThinking ?? lastThinking;
  } catch {
    // Presence failures are non-fatal
  }
}

function pause(ms = 80) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Cursor Animation ──────────────────────────────────────────────
// Smooth cursor movement from current position to destination.
// Sends interpolated positions at ~70ms intervals so the frontend
// CSS transition (200ms ease-out) can chain them into a fluid path.

async function animateCursor(
  roomId: string,
  toX: number,
  toY: number,
  opts?: { steps?: number; stepMs?: number }
) {
  const steps = opts?.steps ?? 10;
  const stepMs = opts?.stepMs ?? 70;
  const fromX = lastCursor?.x ?? 0;
  const fromY = lastCursor?.y ?? 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Ease-out cubic for natural deceleration
    const ease = 1 - Math.pow(1 - t, 3);
    const cx = fromX + (toX - fromX) * ease;
    const cy = fromY + (toY - fromY) * ease;
    await setPresence(roomId, { agentCursor: { x: cx, y: cy }, isThinking: false });
    await pause(stepMs);
  }
}

// ── Room Helpers ───────────────────────────────────────────────────

async function ensureRoomExists(roomId: string): Promise<void> {
  try {
    await liveblocks.getOrCreateRoom(roomId, {
      defaultAccesses: [],
    });
    logger.info("Liveblocks room ensured", { roomId });
  } catch (err) {
    logger.error("Failed to ensure Liveblocks room", { roomId, error: String(err) });
    throw new Error(`Could not create/access Liveblocks room "${roomId}": ${String(err)}`);
  }
}

// ── Main Task ──────────────────────────────────────────────────────

export const designTask = task({
  id: "design-agent",
  maxDuration: 300,
  run: async (payload: { prompt: string; roomId: string; projectId: string; history?: Array<{ role: string; content: string }> }) => {
    const { prompt, roomId, history } = payload;

    logger.info("Design task started", { prompt, roomId });

    await ensureRoomExists(roomId);
    await setPresence(roomId, { isThinking: true, agentCursor: null }, 300);

    try {
      metadata.set("phase", "reading");

      // Queue for serializing tool executions (prevents concurrent writes)
      let queue: Promise<unknown> = Promise.resolve();
      const serial = <T>(fn: () => Promise<T>): Promise<T> => {
        const run = queue.then(() => fn());
        queue = run.then(() => undefined, () => undefined);
        return run;
      };

      let agentText = "";

      await mutateFlow(
        {
          client: liveblocks,
          roomId,
          storageKey: FLOWCHART_STORAGE_KEY,
        },
        async (flow) => {
          // Read current canvas state for the AI
          const canvasJson = JSON.stringify(flow, null, 2);

          // Build conversation history context for the AI
          let historyContext = "";
          if (history && history.length > 0) {
            const recentHistory = history.slice(-20);
            historyContext = recentHistory
              .map((m) => `[${m.role === "user" ? "User" : "KubeAI"}]: ${m.content}`)
              .join("\n");
          }

          metadata.set("phase", "generating");

          // Move cursor to a random starting position while thinking
          const allNodes = [...flow.nodes.values()];
          const bounds = allNodes.length > 0
            ? {
                minX: Math.min(...allNodes.map((n: any) => (n.position?.x ?? 0) - 100)),
                minY: Math.min(...allNodes.map((n: any) => (n.position?.y ?? 0) - 100)),
                maxX: Math.max(...allNodes.map((n: any) => (n.position?.x ?? 0) + 300)),
                maxY: Math.max(...allNodes.map((n: any) => (n.position?.y ?? 0) + 200)),
              }
            : { minX: -200, minY: -200, maxX: 200, maxY: 200 };

          // Thinking cursor — drifts incrementally to random nearby points
          const thinkingTarget = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
          let thinkingStep = 0;
          const thinkingSteps = 10;
          const thinkingInterval = setInterval(() => {
            // Every 10 steps, pick a new random target
            if (thinkingStep % thinkingSteps === 0) {
              thinkingTarget.x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
              thinkingTarget.y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
            }
            // Move a small fraction toward the target
            const from = lastCursor ?? { x: thinkingTarget.x, y: thinkingTarget.y };
            const t = 0.15;
            const nx = from.x + (thinkingTarget.x - from.x) * t;
            const ny = from.y + (thinkingTarget.y - from.y) * t;
            void setPresence(roomId, { agentCursor: { x: nx, y: ny } });
            thinkingStep++;
          }, 1000);

          try {
            const result = await generateText({
              model: googleProvider(GEMINI_MODEL),
              system: SYSTEM_PROMPT,
              prompt: `${historyContext ? `<conversation-history>\n${historyContext}\n</conversation-history>\n\n` : ""}<current-canvas>\n${canvasJson}\n</current-canvas>\n\n<user-message>\n${prompt}\n</user-message>`,
              tools: {
                addNode: tool({
                  description: "Create a new node on the canvas. IMPORTANT: Always set width based on label length — short labels (≤10 chars) use 160-200, medium labels (11-20 chars) use 240-300, long labels (21+ chars) use 320-380. Height should be 100-140. Diamond and circle shapes use equal width/height.",
                  inputSchema: z.object({
                    id: z.string().describe("Unique node ID (e.g. 'node-1')"),
                    label: z.string().describe("Human-readable label"),
                    shape: z.enum(BLOCK_SHAPES),
                    color: z.string().describe("Background hex color from the palette"),
                    x: z.number().describe("X position on canvas — align with grid, no overlaps"),
                    y: z.number().describe("Y position on canvas — align with grid layer"),
                    width: sizeSchema.optional().default(192),
                    height: sizeSchema.optional().default(128),
                  }),
                  execute: async (input) => serial(async () => {
                    const w = input.width ?? 192;
                    const h = input.height ?? 128;

                    // Animate cursor to node center
                    await animateCursor(roomId, input.x + w / 2, input.y + h / 2);

                    if (flow.getNode(input.id)) {
                      return { ok: false, reason: "ID already exists", id: input.id };
                    }

                    const textColor = textColorForBg(input.color);
                    flow.addNode({
                      id: input.id,
                      type: "canvasNode",
                      position: { x: input.x, y: input.y },
                      width: w,
                      height: h,
                      data: {
                        label: input.label,
                        color: input.color,
                        textColor,
                        shape: input.shape,
                      },
                    } as any);

                    await pause();
                    return { ok: true, id: input.id };
                  }),
                }),

                moveNode: tool({
                  description: "Move a node to a new position.",
                  inputSchema: z.object({
                    id: z.string(),
                    x: z.number(),
                    y: z.number(),
                  }),
                  execute: async (input) => serial(async () => {
                    const node = flow.getNode(input.id);
                    if (!node) return { ok: false, reason: "Node not found", id: input.id };

                    const fromX = (node.position as any)?.x ?? 0;
                    const fromY = (node.position as any)?.y ?? 0;

                    // Smoothly animate cursor from current to source node
                    await animateCursor(roomId, fromX + 50, fromY + 50);
                    // Then smoothly animate to destination
                    await animateCursor(roomId, input.x + 50, input.y + 50);

                    flow.updateNode(input.id, { position: { x: input.x, y: input.y } });
                    await pause();
                    return { ok: true, id: input.id };
                  }),
                }),

                updateNode: tool({
                  description: "Update a node's label, shape, or color.",
                  inputSchema: z.object({
                    id: z.string(),
                    label: z.string().optional(),
                    shape: z.enum(BLOCK_SHAPES).optional(),
                    color: z.string().optional(),
                  }),
                  execute: async (input) => serial(async () => {
                    const node = flow.getNode(input.id);
                    if (!node) return { ok: false, reason: "Node not found", id: input.id };

                    const pos = (node.position as any) ?? { x: 0, y: 0 };
                    await animateCursor(roomId, pos.x + 50, pos.y + 50);

                    const updates: Record<string, any> = {};
                    if (input.label !== undefined) updates.label = input.label;
                    if (input.shape !== undefined) updates.shape = input.shape;
                    if (input.color !== undefined) {
                      updates.color = input.color;
                      updates.textColor = textColorForBg(input.color);
                    }

                    if (Object.keys(updates).length > 0) {
                      // Update node data — need to merge with existing data
                      const nodeData = (node as any).data ?? {};
                      flow.updateNodeData(input.id, { ...nodeData, ...updates });
                    }

                    await pause();
                    return { ok: true, id: input.id };
                  }),
                }),

                deleteNode: tool({
                  description: "Delete a node and its connected edges.",
                  inputSchema: z.object({
                    id: z.string(),
                  }),
                  execute: async (input) => serial(async () => {
                    const node = flow.getNode(input.id);
                    if (!node) return { ok: false, reason: "Node not found", id: input.id };

                    const pos = (node.position as any) ?? { x: 0, y: 0 };
                    await animateCursor(roomId, pos.x + 50, pos.y + 50);

                    // Remove connected edges first
                    const edgesToRemove: string[] = [];
                    flow.edges.forEach((edge: any) => {
                      if (edge.source === input.id || edge.target === input.id) {
                        edgesToRemove.push(edge.id);
                      }
                    });
                    for (const edgeId of edgesToRemove) {
                      flow.removeEdge(edgeId);
                      await pause(30);
                    }

                    flow.removeNode(input.id);
                    await pause();
                    return { ok: true, id: input.id, edgesRemoved: edgesToRemove.length };
                  }),
                }),

                deleteAllNodes: tool({
                  description: "Delete ALL nodes and edges from the canvas. Use when the user asks to clear or reset the canvas.",
                  inputSchema: z.object({}),
                  execute: async () => serial(async () => {
                    await animateCursor(roomId, 0, 0, { steps: 8 });

                    // Remove all edges
                    const edgeKeys: string[] = [];
                    flow.edges.forEach((edge: any) => edgeKeys.push(edge.id));
                    for (const k of edgeKeys) flow.removeEdge(k);

                    await pause(50);

                    // Remove all nodes
                    const nodeKeys: string[] = [];
                    flow.nodes.forEach((node: any) => nodeKeys.push(node.id));
                    for (const k of nodeKeys) flow.removeNode(k);

                    await pause();
                    return { ok: true, nodesRemoved: nodeKeys.length, edgesRemoved: edgeKeys.length };
                  }),
                }),

                addEdge: tool({
                  description: "Create an edge between two nodes. Keep edge labels SHORT (≤20 chars). Use verbs like 'Routes', 'Publishes', 'Reads', 'Writes'. Choose sourceHandle/targetHandle to route edges cleanly without crossing other nodes.",
                  inputSchema: z.object({
                    id: z.string().describe("Unique edge ID (e.g. 'edge-1')"),
                    source: z.string().describe("Source node ID"),
                    target: z.string().describe("Target node ID"),
                    sourceHandle: z.string().describe("Source handle (e.g. 'bottom-source', 'right-source')"),
                    targetHandle: z.string().describe("Target handle (e.g. 'top-target', 'left-target')"),
                    label: z.string().optional(),
                  }),
                  execute: async (input) => serial(async () => {
                    const sourceNode = flow.getNode(input.source);
                    const targetNode = flow.getNode(input.target);
                    if (!sourceNode || !targetNode) {
                      return { ok: false, reason: "Source or target node not found" };
                    }

                    const sPos = (sourceNode.position as any) ?? { x: 0, y: 0 };
                    const tPos = (targetNode.position as any) ?? { x: 0, y: 0 };

                    // Animate cursor from source to target
                    await animateCursor(roomId, sPos.x + 50, sPos.y + 50, { steps: 8 });
                    await animateCursor(roomId, tPos.x + 50, tPos.y + 50, { steps: 10 });

                    if (flow.getEdge(input.id)) {
                      return { ok: false, reason: "Edge ID already exists", id: input.id };
                    }

                    const edgeData: Record<string, any> = {};
                    if (input.label) edgeData.label = input.label;

                    flow.addEdge({
                      id: input.id,
                      source: input.source,
                      target: input.target,
                      sourceHandle: input.sourceHandle,
                      targetHandle: input.targetHandle,
                      type: "canvasEdge",
                      data: edgeData,
                    } as any);

                    await pause();
                    return { ok: true, id: input.id };
                  }),
                }),

                updateEdge: tool({
                  description: "Update an edge's label.",
                  inputSchema: z.object({
                    id: z.string(),
                    label: z.string(),
                  }),
                  execute: async (input) => serial(async () => {
                    const edge = flow.getEdge(input.id);
                    if (!edge) return { ok: false, reason: "Edge not found", id: input.id };

                    // Animate cursor along edge midpoint
                    const sNode = flow.getNode(edge.source);
                    const tNode = flow.getNode(edge.target);
                    if (sNode && tNode) {
                      const sp = (sNode.position as any) ?? { x: 0, y: 0 };
                      const tp = (tNode.position as any) ?? { x: 0, y: 0 };
                      await animateCursor(roomId, (sp.x + tp.x) / 2 + 50, (sp.y + tp.y) / 2 + 50, { steps: 8 });
                    }

                    flow.updateEdgeData(input.id, { label: input.label });
                    await pause();
                    return { ok: true, id: input.id };
                  }),
                }),

                deleteEdge: tool({
                  description: "Delete an edge.",
                  inputSchema: z.object({
                    id: z.string(),
                  }),
                  execute: async (input) => serial(async () => {
                    const edge = flow.getEdge(input.id);
                    if (!edge) return { ok: false, reason: "Edge not found", id: input.id };

                    // Animate cursor to edge midpoint
                    const sNode = flow.getNode(edge.source);
                    const tNode = flow.getNode(edge.target);
                    if (sNode && tNode) {
                      const sp = (sNode.position as any) ?? { x: 0, y: 0 };
                      const tp = (tNode.position as any) ?? { x: 0, y: 0 };
                      await animateCursor(roomId, (sp.x + tp.x) / 2 + 50, (sp.y + tp.y) / 2 + 50, { steps: 8 });
                    }

                    flow.removeEdge(input.id);
                    await pause();
                    return { ok: true, id: input.id };
                  }),
                }),

                moveMultipleNodes: tool({
                  description: "Move multiple nodes at once. Use for reorganizing the layout.",
                  inputSchema: z.object({
                    moves: z.array(z.object({
                      id: z.string(),
                      x: z.number(),
                      y: z.number(),
                    })),
                  }),
                  execute: async (input) => serial(async () => {
                    for (const move of input.moves) {
                      const node = flow.getNode(move.id);
                      if (!node) continue;

                      const pos = (node.position as any) ?? { x: 0, y: 0 };
                      await animateCursor(roomId, pos.x + 50, pos.y + 50, { steps: 6, stepMs: 80 });

                      flow.updateNode(move.id, { position: { x: move.x, y: move.y } });
                    }
                    await pause();
                    return { ok: true, moved: input.moves.length };
                  }),
                }),
              },
              stopWhen: stepCountIs(30),
              onStepFinish: ({ toolCalls }) => {
                // Update phase based on tool activity
                if (toolCalls.length > 0) {
                  metadata.set("phase", "applying");
                }
              },
            });

            agentText = result.text;
          } finally {
            clearInterval(thinkingInterval);
          }
        },
      );

      // Clear presence with short TTL (cursor fades after 2s)
      await setPresence(roomId, { isThinking: false }, 2);

      metadata.set("phase", "complete");

      return {
        status: "completed" as const,
        thinking: agentText,
      };
    } catch (error) {
      await setPresence(roomId, { isThinking: false }, 5);
      throw error;
    }
  },
});

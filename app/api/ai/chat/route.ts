import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { streamText, tool, convertToModelMessages, isStepCount, smoothStream } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ── Clients ─────────────────────────────────────────────────────────

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI__API_KEY!,
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// ── Unified System Prompt ───────────────────────────────────────────
import { SYSTEM_PROMPT } from "@/trigger/ai_system_prompt";

// ── Canvas State Reader ─────────────────────────────────────────────
// Reads from the database's canvasJson field (the same JSON the autosave
// writes), so the format is guaranteed to be a simple { nodes[], edges[] }
// structure rather than the complex CRDT serialization of Liveblocks.

async function readCanvasState(
  projectId: string,
): Promise<{ nodes: any[]; edges: any[] }> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { canvasJson: true },
    });

    const canvasJson = project?.canvasJson as any;
    if (!canvasJson) {
      return { nodes: [], edges: [] };
    }

    // canvasJson shape: { nodes: any[], edges: any[] }
    const rawNodes = Array.isArray(canvasJson.nodes) ? canvasJson.nodes : [];
    const rawEdges = Array.isArray(canvasJson.edges) ? canvasJson.edges : [];

    const nodes = rawNodes.map((n: any) => ({
      id: n.id ?? "",
      label: n.data?.label ?? n.label ?? "",
      shape: n.data?.shape ?? "rectangle",
      color: n.data?.color ?? "#1F1F1F",
      logo: n.data?.logo ?? null,
      w: n.width ?? 120,
      h: n.height ?? 80,
    }));

    const edges = rawEdges.map((e: any) => ({
      id: e.id ?? "",
      source: e.source ?? "",
      target: e.target ?? "",
      label: e.label ?? null,
    }));

    console.log(`[AI Chat] Canvas state loaded: ${nodes.length} nodes, ${edges.length} edges`);
    return { nodes, edges };
  } catch (err) {
    console.error("[AI Chat] Failed to read canvas state:", err);
    return { nodes: [], edges: [] };
  }
}

// ── Canvas Summary Builder ──────────────────────────────────────────

function buildCanvasSummary(canvasState: {
  nodes: any[];
  edges: any[];
}): string {
  const nodeCount = canvasState.nodes.length;
  const edgeCount = canvasState.edges.length;

  if (nodeCount === 0 && edgeCount === 0) {
    return "The canvas is currently empty — no components or connections exist yet.";
  }

  const labelById = new Map(canvasState.nodes.map((n) => [n.id, n.label]));

  const nodeList = canvasState.nodes
    .map((n) => {
      const logoPart = n.logo ? `, logo: ${n.logo}` : "";
      const sizePart = n.w && n.h ? `, size: ${Math.round(n.w)}x${Math.round(n.h)}` : "";
      return `  - "${n.label}" (${n.shape}${logoPart}${sizePart}, id: ${n.id})`;
    })
    .join("\n");

  const edgeList = canvasState.edges
    .map((e) => {
      const src = labelById.get(e.source) || e.source;
      const tgt = labelById.get(e.target) || e.target;
      const labelPart = e.label ? ` [${e.label}]` : "";
      return `  - ${src} → ${tgt}${labelPart}`;
    })
    .join("\n");

  let summary = `Components on canvas (${nodeCount}):\n${nodeList}`;
  if (edgeCount > 0) {
    summary += `\n\nConnections (${edgeCount}):\n${edgeList}`;
  }
  return summary;
}

// ── Sliding Window ──────────────────────────────────────────────────
// Send only the last 30 messages to the LLM for cost control.
const MAX_MESSAGES = 30;

// ── POST Handler ────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { messages, projectId } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 },
    );
  }

  if (typeof projectId !== "string" || projectId.trim() === "") {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  // Validate message structure — accept both legacy (content) and v7 (parts) format
  for (const msg of messages) {
    if (
      !msg.role ||
      !["user", "assistant", "system"].includes(msg.role)
    ) {
      return NextResponse.json(
        { error: "Each message must have role (user|assistant|system)" },
        { status: 400 },
      );
    }
    // v7 UIMessage: content is in parts[], not content string
    const hasContent = typeof msg.content === "string" || Array.isArray(msg.parts)
    if (!hasContent) {
      return NextResponse.json(
        { error: "Each message must have content (string) or parts (array)" },
        { status: 400 },
      );
    }
  }

  try {
    // Fetch current canvas state
    const canvasState = await readCanvasState(projectId);
    const canvasSummary = buildCanvasSummary(canvasState);

    // Inject canvas context into the system prompt
    const systemPrompt = `${SYSTEM_PROMPT}\n\n---\n\nCURRENT CANVAS STATE:\n${canvasSummary}`;

    // Sliding window: send only the last N messages to the LLM
    const recentMessages = messages.slice(-MAX_MESSAGES);

    // Convert UIMessage format (v7) to model messages for streamText
    const modelMessages = await convertToModelMessages(recentMessages);

    const result = streamText({
      model: googleProvider(GEMINI_MODEL),
      system: systemPrompt,
      messages: modelMessages,
      stopWhen: isStepCount(5),
      experimental_transform: smoothStream({ chunking: "word" }),
      tools: {
        generateArchitecture: tool({
          description:
            "Call this when the user asks to create, modify, generate, redesign, or rebuild architecture on the canvas. Also call this for requests like 'design a microservices system', 'add a database', 'build an event-driven architecture', 'clear the canvas', or any request that results in visual changes to the canvas. Do NOT call for pure discussion questions.",
          inputSchema: z.object({
            prompt: z
              .string()
              .describe(
                "A detailed description of the architecture to generate or modify. Include what components to add/change/remove, preferred technologies, and layout preferences.",
              ),
          }),
          execute: async ({ prompt }) => {
            console.log("[AI Chat] generateArchitecture tool called — triggering design agent...");
            console.log("[AI Chat] Prompt:", prompt.slice(0, 200));

            try {
              // Pass current canvas state so the agent can do diff-based modifications
              // instead of full clear+rewrite. This preserves user-placed nodes.
              const currentNodes = canvasState.nodes.map((n) => ({
                id: n.id,
                label: n.label,
                shape: n.shape,
                color: n.color,
                logo: n.logo,
              }));
              const currentEdges = canvasState.edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label,
              }));

              const handle = await tasks.trigger("design-agent", {
                prompt,
                roomId: projectId,
                projectId,
                currentArchitecture:
                  currentNodes.length > 0 || currentEdges.length > 0
                    ? { nodes: currentNodes, edges: currentEdges }
                    : undefined,
              });

              console.log("[AI Chat] Design agent triggered:", { runId: handle.id });

              return {
                runId: handle.id,
                status: "triggered",
                message:
                  "Architecture generation started. You'll see changes appear on your canvas in real time.",
              };
            } catch (err) {
              console.error("[AI Chat] generateArchitecture tool error:", err);
              return {
                status: "failed",
                message: `Could not start architecture generation: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
              };
            }
          },
        }),
      },
    });

    // Return streaming response (AI SDK v7)
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

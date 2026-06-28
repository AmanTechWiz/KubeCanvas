import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Liveblocks } from "@liveblocks/node";

// ── Clients ─────────────────────────────────────────────────────────

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI__API_KEY!,
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// ── Chat System Prompt ──────────────────────────────────────────────
// Imported from dedicated prompt file for maintainability.
import { CHAT_SYSTEM_PROMPT } from "@/trigger/chat_system_prompt";

// ── Guardrails ──────────────────────────────────────────────────────
// Deterministic input validation — runs before any LLM or canvas call.
import { validateChatInput } from "@/lib/chat-guardrails";

// ── Canvas State Reader ─────────────────────────────────────────────
// Uses the Liveblocks Node SDK (same client as design-agent) to read
// storage — avoids raw fetch issues with auth, retries, and format.

async function readCanvasState(
  roomId: string,
): Promise<{ nodes: any[]; edges: any[] }> {
  try {
    const storage = await liveblocks.getStorageDocument(roomId, "json");

    const flow = (storage as any)?.flow ?? {};
    const nodesMap = flow.nodes ?? {};
    const edgesMap = flow.edges ?? {};

    const nodes = Object.entries(nodesMap).map(([id, node]: [string, any]) => ({
      id,
      label: node.data?.label ?? "",
      shape: node.data?.shape ?? "rectangle",
      color: node.data?.color ?? "#1F1F1F",
    }));

    const edges = Object.entries(edgesMap).map(([id, edge]: [string, any]) => ({
      id,
      source: edge.source ?? "",
      target: edge.target ?? "",
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
    .map((n) => `  - "${n.label}" (${n.shape}, id: ${n.id})`)
    .join("\n");

  const edgeList = canvasState.edges
    .map(
      (e) =>
        `  - ${labelById.get(e.source) || e.source} → ${labelById.get(e.target) || e.target}`,
    )
    .join("\n");

  let summary = `Components on canvas (${nodeCount}):\n${nodeList}`;
  if (edgeCount > 0) {
    summary += `\n\nConnections (${edgeCount}):\n${edgeList}`;
  }
  return summary;
}

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

  // Validate message structure
  for (const msg of messages) {
    if (
      !msg.role ||
      !["user", "assistant", "system"].includes(msg.role) ||
      typeof msg.content !== "string"
    ) {
      return NextResponse.json(
        { error: "Each message must have role (user|assistant|system) and content (string)" },
        { status: 400 },
      );
    }
  }

  // ── Guardrails ────────────────────────────────────────────────────
  // Deterministic check — blocks prompt injections, code injection,
  // and unicode tricks before anything else happens.
  const guardrail = validateChatInput(messages);
  if (!guardrail.safe) {
    console.warn(`[AI Chat] Guardrail blocked request: ${guardrail.reason}`);
    return NextResponse.json({ reply: guardrail.reply });
  }

  try {
    // Fetch current canvas state so the AI knows what's on the board
    const canvasState = await readCanvasState(projectId);
    const canvasSummary = buildCanvasSummary(canvasState);

    // Inject canvas context into the system prompt
    const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\n---\n\nCURRENT CANVAS STATE:\n${canvasSummary}`;

    const result = streamText({
      model: googleProvider(GEMINI_MODEL),
      system: systemPrompt,
      messages,
    });

    // Return SSE stream — each chunk sends text as it's generated
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

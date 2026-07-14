import { task, metadata, wait } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { Liveblocks } from "@liveblocks/node";
import { mutateFlow } from "@liveblocks/react-flow/node";
import {
  ArchitectureSchema,
  type Architecture,
  type ArchitectureNode,
  type ArchitectureEdge,
} from "@/lib/architecture-schema";
import { layoutArchitecture } from "@/lib/layout-architecture";
import {
  validateArchitecture,
  deduplicateNodes,
  repairOrphans,
} from "@/lib/validate-architecture";
import { LOGO_CATEGORIES } from "@/lib/logo-data";

// ── Clients ─────────────────────────────────────────────────────────

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI__API_KEY!,
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// ── Color Map ───────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  neutral: { bg: "#1F1F1F", text: "#EDEDED" },
  blue: { bg: "#10233D", text: "#52A8FF" },
  purple: { bg: "#2E1938", text: "#9500ff" },
  orange: { bg: "#331B00", text: "#FF990A" },
  red: { bg: "#3C1618", text: "#FF6166" },
  pink: { bg: "#3A1726", text: "#ff2e70" },
  green: { bg: "#0F2E18", text: "#62C073" },
  teal: { bg: "#062822", text: "#0AC7B4" },
};

// ── Valid Logo Set & ID-to-Name Resolution ─────────────────────────
// Pre-built from LOGO_CATEGORIES so we can strip invalid logos
// returned by the LLM before they reach the canvas, and resolve
// logo IDs (e.g. "google-cloud") to their tech-stack-icons name ("gcloud").
// We accept both `icon.id` ("google-cloud") and `icon.icon` ("gcloud").
const VALID_LOGO_IDS = new Set<string>();
const VALID_ICON_NAMES = new Set<string>();
const LOGO_ID_TO_ICON: Record<string, string> = {};
for (const cat of LOGO_CATEGORIES) {
  for (const icon of cat.icons) {
    VALID_LOGO_IDS.add(icon.id);
    if (icon.icon) {
      VALID_ICON_NAMES.add(icon.icon);
      LOGO_ID_TO_ICON[icon.id] = icon.icon;
    }
  }
}
function stripInvalidLogos(arch: Architecture): Architecture {
  return {
    ...arch,
    nodes: arch.nodes.map((n) => {
      if (!n.logo) return n;
      // If logo is already a valid tech-stack-icons name, keep it
      if (VALID_ICON_NAMES.has(n.logo)) return n;
      // If logo matches an id, resolve it to the actual icon name
      if (LOGO_ID_TO_ICON[n.logo]) {
        return { ...n, logo: LOGO_ID_TO_ICON[n.logo] };
      }
      // Otherwise strip it
      console.warn(`[Design Agent] Stripping invalid logo "${n.logo}" from node "${n.label}"`);
      return { ...n, logo: null };
    }),
  };
}

// ── Prompts ─────────────────────────────────────────────────────────

const FRESH_PROMPT = `You are a senior software architect designing a production system.

OUTPUT RULES:
- Output the full architecture as a single JSON object matching the schema.
- Every node MUST have at least one edge (no orphaned nodes).
- Use specific, real technologies: "PostgreSQL 15" not "Database", "Redis 7" not "Cache".
- Every node's description must be one sentence explaining its role.
- Edge labels must be SHORT verbs: "Routes", "Queries", "Publishes", "Writes", "Authenticates". Max 20 chars.
- Color meanings: neutral=generic, blue=core APIs, purple=AI/ML, orange=cache/queue, red=critical, pink=auth/security, green=databases, teal=external.
- Shape meanings: rectangle=general, diamond=routing/decisions, circle=triggers/entry, cylinder=storage, hexagon=external.
- For well-known technologies (PostgreSQL, Redis, Docker, Kubernetes, React, Next.js, etc.), set the logo field to a valid icon name (e.g. "postgresql", "redis", "docker"). Set to null for generic components.
- If you don't know whether a specific brand/technology has an icon, or if it's an obscure tool — set logo to null. The node will render as colored text inside its shape. NEVER guess or make up icon names — invalid names crash the UI.
- Complexity: 8-15 nodes for simple, 15-25 for standard, 25-40 for complex/production.
- Do NOT over-engineer simple requests. A blog doesn't need Kafka and Elasticsearch.
- Do NOT under-engineer complex requests. A production e-commerce platform needs proper infrastructure.
- NEVER output coordinates, sizes, or handle positions — the layout engine computes those.

NAMING: Avoid "Service A", "Backend Service". Prefer "Payment Orchestrator", "Fraud Engine", "Feed Generator".

NEVER output code, scripts, configuration, or terraform. This is a diagram-only tool.`;

const MODIFY_PROMPT = `You are a senior software architect modifying an existing architecture.

The user has an existing canvas with components already placed. They want to make a change.

CURRENT CANVAS STATE:
{currentCanvas}

RULES FOR MODIFICATION:
- Output the COMPLETE target architecture — all nodes and edges that should exist after your change.
- PRESERVE all existing components unless the user explicitly asks to remove them.
- When adding a component, also add edges connecting it to the existing architecture.
- When the user says "add X", add the component and connect it appropriately. Do NOT recreate existing components.
- When the user says "remove X", remove that component and its edges from the target.
- When the user says "change X to Y", update that component's properties.
- Use the same IDs as the existing components when preserving them.
- New component IDs should follow the same kebab-case convention.

OUTPUT RULES:
- Output the full architecture as a single JSON object matching the schema.
- Every node MUST have at least one edge (no orphaned nodes).
- Use specific, real technologies: "PostgreSQL 15" not "Database", "Redis 7" not "Cache".
- Edge labels must be SHORT verbs: "Routes", "Queries", "Publishes", "Writes". Max 20 chars.
- Color meanings: neutral=generic, blue=core APIs, purple=AI/ML, orange=cache/queue, red=critical, pink=auth/security, green=databases, teal=external.
- Shape meanings: rectangle=general, diamond=routing/decisions, circle=triggers/entry, cylinder=storage, hexagon=external.
- For well-known technologies, set the logo field. Set to null for generic components.
- If you don't know whether a brand has an icon, set logo to null. NEVER guess or make up icon names — invalid names crash the UI.
- NEVER output coordinates, sizes, or handle positions.

NEVER output code, scripts, configuration, or terraform.`;

// ── Diff Computation ────────────────────────────────────────────────

interface ArchitectureDiff {
  addNodes: ArchitectureNode[];
  addEdges: ArchitectureEdge[];
  removeNodeIds: string[];
  removeEdgeIds: string[];
  updateNodes: Array<{ id: string; changes: Partial<ArchitectureNode> }>;
  updateEdges: Array<{ id: string; changes: Partial<ArchitectureEdge> }>;
}

function computeDiff(
  current: { nodes: Array<{ id: string; label: string; shape: string; color: string; logo: string | null }>; edges: Array<{ id: string; source: string; target: string; label: string | null }> },
  target: Architecture,
): ArchitectureDiff {
  const currentNodeIds = new Set(current.nodes.map((n) => n.id));
  const targetNodeIds = new Set(target.nodes.map((n) => n.id));
  const currentEdgeIds = new Set(current.edges.map((e) => e.id));
  const targetEdgeIds = new Set(target.edges.map((e) => e.id));

  // Nodes to add (in target but not current)
  const addNodes = target.nodes.filter((n) => !currentNodeIds.has(n.id));

  // Nodes to remove (in current but not target)
  const removeNodeIds = current.nodes
    .filter((n) => !targetNodeIds.has(n.id))
    .map((n) => n.id);

  // Nodes to update (in both, but data changed)
  const updateNodes: ArchitectureDiff["updateNodes"] = [];
  for (const targetNode of target.nodes) {
    const currentNode = current.nodes.find((n) => n.id === targetNode.id);
    if (!currentNode) continue;

    const changes: Partial<ArchitectureNode> = {};
    if (currentNode.label !== targetNode.label) changes.label = targetNode.label;
    if (currentNode.shape !== targetNode.shape) changes.shape = targetNode.shape;
    if (currentNode.color !== targetNode.color) changes.color = targetNode.color;
    if (currentNode.logo !== targetNode.logo) changes.logo = targetNode.logo;

    if (Object.keys(changes).length > 0) {
      updateNodes.push({ id: targetNode.id, changes });
    }
  }

  // Edges to add
  const addEdges = target.edges.filter((e) => !currentEdgeIds.has(e.id));

  // Edges to remove
  const removeEdgeIds = current.edges
    .filter((e) => !targetEdgeIds.has(e.id))
    .map((e) => e.id);

  // Edges to update
  const updateEdges: ArchitectureDiff["updateEdges"] = [];
  for (const targetEdge of target.edges) {
    const currentEdge = current.edges.find((e) => e.id === targetEdge.id);
    if (!currentEdge) continue;

    const changes: Partial<ArchitectureEdge> = {};
    if (currentEdge.label !== targetEdge.label) changes.label = targetEdge.label;
    if (currentEdge.source !== targetEdge.source) changes.source = targetEdge.source;
    if (currentEdge.target !== targetEdge.target) changes.target = targetEdge.target;

    if (Object.keys(changes).length > 0) {
      updateEdges.push({ id: targetEdge.id, changes });
    }
  }

  return {
    addNodes,
    addEdges,
    removeNodeIds,
    removeEdgeIds,
    updateNodes,
    updateEdges,
  };
}

function logDiff(diff: ArchitectureDiff) {
  const actions: string[] = [];
  if (diff.addNodes.length > 0) actions.push(`add ${diff.addNodes.length} nodes`);
  if (diff.removeNodeIds.length > 0) actions.push(`remove ${diff.removeNodeIds.length} nodes`);
  if (diff.updateNodes.length > 0) actions.push(`update ${diff.updateNodes.length} nodes`);
  if (diff.addEdges.length > 0) actions.push(`add ${diff.addEdges.length} edges`);
  if (diff.removeEdgeIds.length > 0) actions.push(`remove ${diff.removeEdgeIds.length} edges`);
  if (diff.updateEdges.length > 0) actions.push(`update ${diff.updateEdges.length} edges`);
  console.log(`[Design Agent] Diff: ${actions.join(", ") || "no changes"}`);
}

// ── Task ────────────────────────────────────────────────────────────

export const designAgent = task({
  id: "design-agent",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    prompt: string;
    roomId: string;
    projectId: string;
    currentArchitecture?: {
      nodes: Array<{ id: string; label: string; shape: string; color: string; logo: string | null }>;
      edges: Array<{ id: string; source: string; target: string; label: string | null }>;
    };
  }) => {
    const { prompt, roomId, currentArchitecture } = payload;
    const isModification = !!currentArchitecture && (currentArchitecture.nodes.length > 0 || currentArchitecture.edges.length > 0);

    // ── Detect clear canvas intent ──────────────────────────────────
    const clearIntent = /\b(clear|reset|empty|wipe|remove all|delete all|clean)\b/i.test(prompt) &&
      /\b(canvas|board|diagram|architecture|all|everything)\b/i.test(prompt);

    if (clearIntent) {
      console.log(`[Design Agent] Clear canvas intent detected — clearing room ${roomId}`);
      await liveblocks.mutateStorage(roomId, async ({ root }) => {
        root.set("agentThinking", false);
        root.set("agentCursor", null);
      });
      await mutateFlow({ client: liveblocks, roomId }, (flow) => {
        for (const n of flow.nodes) flow.removeNode(n.id);
        for (const e of flow.edges) flow.removeEdge(e.id);
      });
      console.log(`[Design Agent] Canvas cleared`);
      metadata.set("phase", "complete");
      return { status: "completed", nodesCount: 0, edgesCount: 0, mode: "clear" };
    }

    console.log(`[Design Agent] Starting for room ${roomId} (${isModification ? "modification" : "fresh"})`);
    console.log(`[Design Agent] Prompt: ${prompt.slice(0, 200)}`);

    // ── Set agent thinking state ───────────────────────────────────
    await liveblocks.mutateStorage(roomId, async ({ root }) => {
      root.set("agentThinking", true);
      root.set("agentCursor", { x: 400, y: 300 });
    });
    metadata.set("phase", "reading");

    // ── 1. Generate target architecture ────────────────────────────
    let architecture: Architecture;
    try {
      const systemPrompt = isModification
        ? MODIFY_PROMPT.replace("{currentCanvas}", JSON.stringify(currentArchitecture, null, 2))
        : FRESH_PROMPT;

      const userMessage = isModification
        ? `The user wants to: ${prompt}\n\nOutput the COMPLETE target architecture (all nodes and edges that should exist after the change). Preserve existing components unless asked to remove them.`
        : prompt;

      const result = await generateObject({
        model: googleProvider(GEMINI_MODEL),
        schema: ArchitectureSchema,
        prompt: `${systemPrompt}\n\nUser request: ${userMessage}`,
        temperature: 0.7,
      });
      architecture = result.object;
      // Strip any logos that don't exist in tech-stack-icons
      architecture = stripInvalidLogos(architecture);
      console.log(
        `[Design Agent] Generated: ${architecture.nodes.length} nodes, ${architecture.edges.length} edges`,
      );
      metadata.set("phase", "generating");
    } catch (err) {
      console.error("[Design Agent] generateObject failed:", err);
      await liveblocks.mutateStorage(roomId, async ({ root }) => {
        root.set("agentThinking", false);
        root.set("agentCursor", null);
      });
      throw err;
    }

    // ── 2. Deduplicate ────────────────────────────────────────────
    architecture = deduplicateNodes(architecture);

    // ── 3. Validate ───────────────────────────────────────────────
    const validation = validateArchitecture(architecture);
    if (!validation.valid) {
      console.warn(
        `[Design Agent] Validation issues:`,
        validation.issues.join("; "),
      );
      if (validation.orphans.length > 0) {
        const repairEdges = repairOrphans(architecture, validation.orphans);
        architecture.edges.push(...repairEdges);
        console.log(
          `[Design Agent] Repaired ${repairEdges.length} orphaned nodes`,
        );
      }
    }

    // ── 4. Layout with dagre ──────────────────────────────────────
    const { nodes: layoutNodes, edges: layoutEdges } = layoutArchitecture(architecture);
    console.log(
      `[Design Agent] Layout complete: ${layoutNodes.length} positioned nodes, ${layoutEdges.length} edges`,
    );

    // Move cursor to center of generated layout
    if (layoutNodes.length > 0) {
      const centerX = layoutNodes.reduce((s, n) => s + n.position.x, 0) / layoutNodes.length;
      const centerY = layoutNodes.reduce((s, n) => s + n.position.y, 0) / layoutNodes.length;
      await liveblocks.mutateStorage(roomId, async ({ root }) => {
        root.set("agentCursor", { x: centerX, y: centerY });
      });
    }
    metadata.set("phase", "applying");

    // ── 5. Apply to Liveblocks with step-by-step cursor animation ──
    //
    // Each node and edge is added individually so the agent cursor
    // smoothly glides across the canvas and users can follow along.

    const ANIM_DELAY = 0.25; // seconds between steps

    async function moveCursor(x: number, y: number) {
      await liveblocks.mutateStorage(roomId, async ({ root }) => {
        root.set("agentCursor", { x, y });
      });
    }

    if (isModification) {
      // Diff-based: only apply changes
      const diff = computeDiff(currentArchitecture!, architecture);
      logDiff(diff);

      // ── Batch removals (no animation needed for vanishing items) ──
      if (diff.removeNodeIds.length > 0 || diff.removeEdgeIds.length > 0) {
        await mutateFlow({ client: liveblocks, roomId }, (flow) => {
          for (const id of diff.removeEdgeIds) flow.removeEdge(id);
          for (const id of diff.removeNodeIds) flow.removeNode(id);
        });
      }

      // ── Animate new nodes one by one ─────────────────────────────
      for (const node of diff.addNodes) {
        const layoutNode = layoutNodes.find((n) => n.id === node.id);
        if (layoutNode) {
          await moveCursor(layoutNode.position.x, layoutNode.position.y);
          await wait.for({ seconds: ANIM_DELAY });
        }
        const color = COLOR_MAP[node.color] ?? COLOR_MAP.neutral;
        await mutateFlow({ client: liveblocks, roomId }, (flow) => {
          flow.addNode({
            id: node.id,
            type: "canvasNode",
            position: layoutNode?.position ?? { x: 0, y: 0 },
            data: {
              label: node.label,
              color: color.bg,
              textColor: color.text,
              shape: node.shape,
              logo: node.logo,
            },
            ...(layoutNode?.measured
              ? { width: layoutNode.measured.width, height: layoutNode.measured.height }
              : {}),
          } as any);
        });
      }

      // ── Animate new edges one by one ─────────────────────────────
      for (const edge of diff.addEdges) {
        const layoutEdge = layoutEdges.find((e) => e.id === edge.id);
        // Move cursor to midpoint between source and target
        const srcLayout = layoutNodes.find((n) => n.id === edge.source);
        const tgtLayout = layoutNodes.find((n) => n.id === edge.target);
        if (srcLayout && tgtLayout) {
          const midX = (srcLayout.position.x + tgtLayout.position.x) / 2;
          const midY = (srcLayout.position.y + tgtLayout.position.y) / 2;
          await moveCursor(midX, midY);
          await wait.for({ seconds: ANIM_DELAY });
        } else if (srcLayout) {
          await moveCursor(srcLayout.position.x, srcLayout.position.y);
          await wait.for({ seconds: ANIM_DELAY });
        }
        await mutateFlow({ client: liveblocks, roomId }, (flow) => {
          flow.addEdge({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: layoutEdge?.sourceHandle ?? "bottom",
            targetHandle: layoutEdge?.targetHandle ?? "top",
            type: "canvasEdge",
            data: { label: edge.label },
            label: edge.label,
          } as any);
        });
      }

      // ── Batch node updates ───────────────────────────────────────
      if (diff.updateNodes.length > 0) {
        // Move cursor to center of all updated nodes
        if (diff.updateNodes.length > 0) {
          const avgX =
            diff.updateNodes.reduce((sum, u) => {
              const ln = layoutNodes.find((n) => n.id === u.id);
              return sum + (ln?.position.x ?? 0);
            }, 0) / diff.updateNodes.length;
          const avgY =
            diff.updateNodes.reduce((sum, u) => {
              const ln = layoutNodes.find((n) => n.id === u.id);
              return sum + (ln?.position.y ?? 0);
            }, 0) / diff.updateNodes.length;
          await moveCursor(avgX, avgY);
          await wait.for({ seconds: ANIM_DELAY });
        }
        await mutateFlow({ client: liveblocks, roomId }, (flow) => {
          for (const { id, changes } of diff.updateNodes) {
            const layoutNode = layoutNodes.find((n) => n.id === id);
            const nodeData: Record<string, unknown> = {};
            if (changes.label !== undefined) nodeData.label = changes.label;
            if (changes.color !== undefined) {
              const c = COLOR_MAP[changes.color] ?? COLOR_MAP.neutral;
              nodeData.color = c.bg;
              nodeData.textColor = c.text;
            }
            if (changes.shape !== undefined) nodeData.shape = changes.shape;
            if (changes.logo !== undefined) nodeData.logo = changes.logo;
            if (Object.keys(nodeData).length > 0) {
              flow.updateNodeData(id, nodeData as any);
            }
            if (layoutNode?.position) {
              flow.updateNode(id, { position: layoutNode.position } as any);
            }
          }
        });
      }

      // ── Batch edge updates ───────────────────────────────────────
      if (diff.updateEdges.length > 0) {
        await mutateFlow({ client: liveblocks, roomId }, (flow) => {
          for (const { id, changes } of diff.updateEdges) {
            const layoutEdge = layoutEdges.find((e) => e.id === id);
            const edgeData: Record<string, unknown> = {};
            if (changes.label !== undefined) edgeData.label = changes.label;
            if (changes.source !== undefined) edgeData.source = changes.source;
            if (changes.target !== undefined) edgeData.target = changes.target;
            if (Object.keys(edgeData).length > 0) {
              flow.updateEdge(id, edgeData as any);
            }
          }
        });
      }
    } else {
      // Fresh: clear everything first
      await mutateFlow({ client: liveblocks, roomId }, (flow) => {
        for (const n of flow.nodes) flow.removeNode(n.id);
        for (const e of flow.edges) flow.removeEdge(e.id);
      });

      // ── Animate nodes one by one ─────────────────────────────────
      for (const node of layoutNodes) {
        await moveCursor(node.position.x, node.position.y);
        await wait.for({ seconds: ANIM_DELAY });

        const color = COLOR_MAP[node.data.color] ?? COLOR_MAP.neutral;
        await mutateFlow({ client: liveblocks, roomId }, (flow) => {
          flow.addNode({
            id: node.id,
            type: node.type,
            position: node.position,
            data: {
              label: node.data.label,
              color: color.bg,
              textColor: color.text,
              shape: node.data.shape,
              logo: node.data.logo,
            },
            ...(node.measured
              ? { width: node.measured.width, height: node.measured.height }
              : {}),
          } as any);
        });
      }

      // ── Animate edges one by one ─────────────────────────────────
      for (const edge of layoutEdges) {
        // Move cursor to midpoint between source and target
        const srcLayout = layoutNodes.find((n) => n.id === edge.source);
        const tgtLayout = layoutNodes.find((n) => n.id === edge.target);
        if (srcLayout && tgtLayout) {
          const midX = (srcLayout.position.x + tgtLayout.position.x) / 2;
          const midY = (srcLayout.position.y + tgtLayout.position.y) / 2;
          await moveCursor(midX, midY);
          await wait.for({ seconds: ANIM_DELAY });
        } else if (srcLayout) {
          await moveCursor(srcLayout.position.x, srcLayout.position.y);
          await wait.for({ seconds: ANIM_DELAY });
        }

        await mutateFlow({ client: liveblocks, roomId }, (flow) => {
          flow.addEdge({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            type: edge.type,
            data: { label: edge.label },
            label: edge.label,
          } as any);
        });
      }
    }

    console.log(`[Design Agent] Canvas updated successfully`);

    // ── Clear agent state ──────────────────────────────────────────
    metadata.set("phase", "complete");
    await liveblocks.mutateStorage(roomId, async ({ root }) => {
      root.set("agentThinking", false);
      root.set("agentCursor", null);
    });

    return {
      status: "completed",
      nodesCount: layoutNodes.length,
      edgesCount: layoutEdges.length,
      mode: isModification ? "modification" : "fresh",
    };
  },
});

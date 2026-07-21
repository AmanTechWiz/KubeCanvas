import { z } from "zod";

// ── Architecture Schema ─────────────────────────────────────────────
// Used with `generateObject` — AI outputs the full architecture once.
// Layout, sizing, and handle assignment are computed by dagre, NOT the AI.
// The AI only decides WHAT to connect, not WHERE to place it.

export const ArchitectureNodeSchema = z.object({
  id: z.string().describe("Unique node ID, lowercase-kebab, e.g. 'api-gateway'"),
  label: z
    .string()
    .describe("Display label, e.g. 'API Gateway', 'PostgreSQL Primary'"),
  description: z
    .string()
    .describe("One-line purpose, e.g. 'Routes HTTP traffic to backend services'"),
  technology: z
    .string()
    .describe(
      "Specific technology name, e.g. 'AWS ALB', 'PostgreSQL 15', 'Redis 7'. Use real product names.",
    ),
  shape: z
    .enum(["rectangle", "diamond", "circle", "cylinder", "hexagon"])
    .describe(
      "rectangle=general, diamond=routing/decisions, circle=triggers/entry, cylinder=storage, hexagon=external",
    ),
  layer: z
    .enum([
      "entry",
      "edge",
      "auth",
      "service",
      "async",
      "data",
      "external",
      "observability",
    ])
    .describe(
      "Vertical tier: entry(top) > edge > auth > service > async > data > external > observability(bottom)",
    ),
  color: z
    .enum([
      "neutral",
      "blue",
      "purple",
      "orange",
      "red",
      "pink",
      "green",
      "teal",
    ])
    .describe(
      "neutral=generic, blue=core APIs, purple=AI/ML, orange=cache/queue, red=critical, pink=auth/security, green=databases, teal=external",
    ),
  logo: z
    .string()
    .nullable()
    .describe(
      "tech-stack-icons icon name (e.g. 'postgresql', 'redis', 'nextjs') or null if none.",
    ),
});

export const ArchitectureEdgeSchema = z.object({
  id: z.string().describe("Unique edge ID, e.g. 'edge-api-to-db'"),
  source: z.string().describe("Source node ID"),
  target: z.string().describe("Target node ID"),
  label: z
    .string()
    .describe(
      "Short verb phrase, e.g. 'Routes', 'Queries', 'Publishes'. Max 20 chars.",
    ),
});

export const ArchitectureSchema = z.object({
  direction: z
    .enum(["TB", "LR", "BT", "RL"])
    .optional()
    .describe(
      "LAYOUT DIRECTION. You MUST set this when the user mentions ANY direction preference. 'left to right'/'LR'/'horizontal' → 'LR'. 'right to left'/'RL' → 'RL'. 'bottom to top'/'BT' → 'BT'. 'top to bottom'/'TB'/'vertical' → 'TB'. If no direction is mentioned, omit. Without this field, layout defaults to top-to-bottom.",
    ),
  nodes: z
    .array(ArchitectureNodeSchema)
    .min(1)
    .describe(
      "All architecture nodes. Every node must have at least one edge.",
    ),
  edges: z
    .array(ArchitectureEdgeSchema)
    .min(1)
    .describe(
      "All connections. Every node MUST appear in at least one edge (no orphans).",
    ),
});

export type ArchitectureNode = z.infer<typeof ArchitectureNodeSchema>;
export type ArchitectureEdge = z.infer<typeof ArchitectureEdgeSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;

// ── Architecture Diff Schema ────────────────────────────────────────
// Used for modifications — AI outputs the full target architecture,
// then we diff against current state to compute minimal mutations.

export const ArchitectureDiffSchema = z.object({
  addNodes: z.array(ArchitectureNodeSchema).describe("Nodes to add"),
  addEdges: z.array(ArchitectureEdgeSchema).describe("Edges to add"),
  removeNodes: z.array(z.string()).describe("Node IDs to remove"),
  removeEdges: z.array(z.string()).describe("Edge IDs to remove"),
  updateNodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().optional(),
        description: z.string().optional(),
        technology: z.string().optional(),
        shape: z
          .enum(["rectangle", "diamond", "circle", "cylinder", "hexagon"])
          .optional(),
        layer: z
          .enum([
            "entry",
            "edge",
            "auth",
            "service",
            "async",
            "data",
            "external",
            "observability",
          ])
          .optional(),
        color: z
          .enum([
            "neutral",
            "blue",
            "purple",
            "orange",
            "red",
            "pink",
            "green",
            "teal",
          ])
          .optional(),
        logo: z.string().nullable().optional(),
      }),
    )
    .describe("Nodes to update (partial fields)"),
  updateEdges: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().optional(),
        source: z.string().optional(),
        target: z.string().optional(),
      }),
    )
    .describe("Edges to update (partial fields)"),
});

export type ArchitectureDiff = z.infer<typeof ArchitectureDiffSchema>;

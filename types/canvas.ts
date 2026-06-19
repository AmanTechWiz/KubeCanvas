import type { Node, Edge } from "@xyflow/react";

// ── Node data ──────────────────────────────────────────────────────────
export interface CanvasNodeData {
  label: string;
  color: string;
  shape: "rect" | "ellipse" | "diamond";
  [key: string]: unknown;
}

// ── Node type ──────────────────────────────────────────────────────────
export type CanvasNode = Node<CanvasNodeData, "canvasNode">;

// ── Edge type ──────────────────────────────────────────────────────────
export type CanvasEdge = Edge<Record<string, unknown>, "canvasEdge">;

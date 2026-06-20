import type { Node, Edge } from "@xyflow/react";

// ── Shape type ─────────────────────────────────────────────────────────
export type NodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon";

// ── Node color palette ─────────────────────────────────────────────────
export interface NodeColor {
  bg: string;
  text: string;
  label: string;
}

export const NODE_COLORS: NodeColor[] = [
  { bg: "#1F1F1F", text: "#EDEDED", label: "Neutral" },
  { bg: "#10233D", text: "#52A8FF", label: "Blue" },
  { bg: "#2E1938", text: "#9500ff", label: "Purple" },
  { bg: "#331B00", text: "#FF990A", label: "Orange" },
  { bg: "#3C1618", text: "#FF6166", label: "Red" },
  { bg: "#3A1726", text: "#ff2e70", label: "Pink" },
  { bg: "#0F2E18", text: "#62C073", label: "Green" },
  { bg: "#062822", text: "#0AC7B4", label: "Teal" },
];

export const DEFAULT_NODE_COLOR = NODE_COLORS[0];

// ── Node data ──────────────────────────────────────────────────────────
export interface CanvasNodeData {
  label: string;
  color: string;
  textColor: string;
  shape: NodeShape;
  [key: string]: unknown; // -> using this for future additional properties!!
}

/** Look up the matching text color for a given background color. Falls back to `#EDEDED`. */
export function textColorForBg(bg: string): string {
  const match = NODE_COLORS.find((c) => c.bg.toLowerCase() === bg.toLowerCase());
  return match ? match.text : "#EDEDED";
}

// ── Node type ──────────────────────────────────────────────────────────
export type CanvasNode = Node<CanvasNodeData, "canvasNode">;

// ── Edge type ──────────────────────────────────────────────────────────
export type CanvasEdge = Edge<Record<string, unknown>, "canvasEdge">;

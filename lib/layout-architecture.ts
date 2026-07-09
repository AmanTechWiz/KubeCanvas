import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { Architecture, ArchitectureNode, ArchitectureEdge } from "./architecture-schema";
import type { CanvasNodeData } from "@/types/canvas";

// ── Dimensions ──────────────────────────────────────────────────────
const CHAR_WIDTH = 13;
const H_PAD = 60;
const MIN_WIDTH = 160;
const MAX_WIDTH = 380;
const NODE_HEIGHT = 80;
const MIN_SQUARE = 140;

// ── Compute node dimensions from label ──────────────────────────────
function nodeDimensions(label: string): { w: number; h: number } {
  const textWidth = label.length * CHAR_WIDTH;
  let w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, textWidth + H_PAD));
  let h = NODE_HEIGHT;
  return { w, h };
}

function squareDimensions(label: string, minSize: number): { w: number; h: number } {
  const textWidth = label.length * CHAR_WIDTH;
  const size = Math.max(minSize, Math.min(MAX_WIDTH, textWidth + H_PAD));
  return { w: size, h: size };
}

// ── Compute handles from relative positions ─────────────────────────
function computeHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  // Same vertical position → connect horizontally
  if (Math.abs(dy) < 20) {
    return dx > 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }

  // Primary: vertical flow (top-to-bottom)
  if (dy > 0) {
    return { sourceHandle: "bottom", targetHandle: "top" };
  }
  return { sourceHandle: "top", targetHandle: "bottom" };
}

// ── Layout function ─────────────────────────────────────────────────
export function layoutArchitecture(arch: Architecture): {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 100, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre graph
  for (const n of arch.nodes) {
    let dims: { w: number; h: number };
    if (n.shape === "diamond") {
      dims = squareDimensions(n.label, MIN_SQUARE);
    } else if (n.shape === "circle") {
      dims = squareDimensions(n.label, MIN_SQUARE);
    } else {
      dims = nodeDimensions(n.label);
    }
    g.setNode(n.id, { width: dims.w, height: dims.h });
  }

  // Add edges to dagre graph
  for (const e of arch.edges) {
    g.setEdge(e.source, e.target);
  }

  // Run layout
  dagre.layout(g);

  // Map dagre positions → React Flow nodes
  const nodeMap = new Map<string, ArchitectureNode>();
  for (const n of arch.nodes) nodeMap.set(n.id, n);

  const nodes: Node<CanvasNodeData>[] = arch.nodes.map((n) => {
    const pos = g.node(n.id);
    const dims = g.node(n.id);
    const w = dims.width;
    const h = dims.height;

    return {
      id: n.id,
      type: "canvasNode",
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
      data: {
        label: n.label,
        color: n.color,
        textColor: "#EDEDED",
        shape: n.shape,
        logo: n.logo ?? undefined,
      },
      measured: { width: w, height: h },
    };
  });

  // Map edges with handle assignment
  const posMap = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    posMap.set(n.id, { x: n.position.x, y: n.position.y });
  }

  const edges: Edge[] = arch.edges.map((e) => {
    const sPos = posMap.get(e.source) ?? { x: 0, y: 0 };
    const tPos = posMap.get(e.target) ?? { x: 0, y: 0 };
    const { sourceHandle, targetHandle } = computeHandles(sPos, tPos);

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle,
      targetHandle,
      label: e.label,
      type: "canvasEdge",
      animated: false,
    };
  });

  return { nodes, edges };
}

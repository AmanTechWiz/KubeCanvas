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

// ── Connection-based positioning for new nodes ─────────────────────
//
// During modifications, new nodes are placed relative to the existing
// node they connect to — NOT via dagre's TB layout. This preserves
// the user's layout direction (LR, TB, or freeform).
//
// ── Detect dominant direction from existing node positions ─────────
// Counts horizontal vs vertical edges between existing nodes.
// Returns the dagre rankdir that matches the canvas layout.
function detectDirectionFromPositions(
  existingPositions: Map<string, { x: number; y: number }>,
  edges: Array<{ source: string; target: string }>,
): "TB" | "LR" | "BT" | "RL" {
  let horizontal = 0;
  let vertical = 0;
  for (const e of edges) {
    const src = existingPositions.get(e.source);
    const tgt = existingPositions.get(e.target);
    if (!src || !tgt) continue;
    const dx = Math.abs(tgt.x - src.x);
    const dy = Math.abs(tgt.y - src.y);
    if (dx >= dy) horizontal++; else vertical++;
  }
  // If no edges between existing nodes, fall back to bounding-box aspect ratio
  if (horizontal === 0 && vertical === 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pos of existingPositions.values()) {
      minX = Math.min(minX, pos.x); maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y); maxY = Math.max(maxY, pos.y);
    }
    return (maxX - minX) > (maxY - minY) ? "LR" : "TB";
  }
  return horizontal >= vertical ? "LR" : "TB";
}

export function computeNewNodePositions(
  newNodeIds: Set<string>,
  allEdges: Array<{ source: string; target: string }>,
  existingPositions: Map<string, { x: number; y: number }>,
  newDims: Map<string, { w: number; h: number }>,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // ── Per-anchor direction inference ────────────────────────────────
  // For each existing node, count how many of its edges to OTHER existing
  // nodes are horizontal (|dx| >= |dy|) vs vertical. Majority vote → "x" or "y".
  // "x" = LR-dominant flow → new nodes go RIGHT + stagger DOWN
  // "y" = TB-dominant flow → new nodes go BELOW + stagger RIGHT

  const existingEdgeDirs = new Map<string, { x: number; y: number }>();
  for (const e of allEdges) {
    if (newNodeIds.has(e.source) || newNodeIds.has(e.target)) continue;
    const srcPos = existingPositions.get(e.source);
    const tgtPos = existingPositions.get(e.target);
    if (!srcPos || !tgtPos) continue;
    const dx = Math.abs(tgtPos.x - srcPos.x);
    const dy = Math.abs(tgtPos.y - srcPos.y);
    const dir = dx >= dy ? "x" : "y";
    for (const id of [e.source, e.target]) {
      if (!existingEdgeDirs.has(id)) existingEdgeDirs.set(id, { x: 0, y: 0 });
      existingEdgeDirs.get(id)![dir]++;
    }
  }

  const anchorDominant = new Map<string, "x" | "y">();
  for (const [id, counts] of existingEdgeDirs) {
    anchorDominant.set(id, counts.x >= counts.y ? "x" : "y");
  }

  const OFFSET_PRIMARY = 300;
  const OFFSET_CROSS = 260;

  // Build adjacency
  const newToExisting = new Map<string, string[]>();
  const newToNew = new Map<string, string[]>();

  for (const e of allEdges) {
    const srcIsNew = newNodeIds.has(e.source);
    const tgtIsNew = newNodeIds.has(e.target);

    if (srcIsNew && !tgtIsNew) {
      if (!newToExisting.has(e.source)) newToExisting.set(e.source, []);
      newToExisting.get(e.source)!.push(e.target);
    } else if (!srcIsNew && tgtIsNew) {
      if (!newToExisting.has(e.target)) newToExisting.set(e.target, []);
      newToExisting.get(e.target)!.push(e.source);
    } else if (srcIsNew && tgtIsNew) {
      if (!newToNew.has(e.source)) newToNew.set(e.source, []);
      newToNew.get(e.source)!.push(e.target);
      if (!newToNew.has(e.target)) newToNew.set(e.target, []);
      newToNew.get(e.target)!.push(e.source);
    }
  }

  // Phase 1: Position nodes connected to existing nodes
  const placed = new Set<string>();
  const anchorChildCount = new Map<string, number>();

  const sortedNew = [...newNodeIds].sort((a, b) => {
    const aCount = newToExisting.get(a)?.length ?? 0;
    const bCount = newToExisting.get(b)?.length ?? 0;
    return bCount - aCount;
  });

  for (const nodeId of sortedNew) {
    const anchors = newToExisting.get(nodeId);
    if (!anchors || anchors.length === 0) continue;

    // Determine dominant direction from anchor nodes
    let xVotes = 0;
    let yVotes = 0;
    for (const anchorId of anchors) {
      const d = anchorDominant.get(anchorId) ?? "y"; // default TB if no data
      if (d === "x") xVotes++; else yVotes++;
    }
    const isLR = xVotes > yVotes;

    // Centroid of all connected existing nodes (use CENTER positions, not top-left)
    let avgX = 0,
      avgY = 0;
    for (const anchorId of anchors) {
      const pos =
        existingPositions.get(anchorId) ??
        positions.get(anchorId) ?? { x: 0, y: 0 };
      // existingPositions stores top-left, convert to center
      const anchorW = newDims.get(anchorId)?.w ?? 180;
      const anchorH = newDims.get(anchorId)?.h ?? 120;
      avgX += pos.x + anchorW / 2;
      avgY += pos.y + anchorH / 2;
    }
    avgX /= anchors.length;
    avgY /= anchors.length;

    // Stagger siblings
    const primaryAnchor = anchors[0];
    const siblings = anchorChildCount.get(primaryAnchor) ?? 0;
    anchorChildCount.set(primaryAnchor, siblings + 1);

    const nodeW = newDims.get(nodeId)?.w ?? 180;
    const nodeH = newDims.get(nodeId)?.h ?? 120;

    if (isLR) {
      // LR flow: place to the RIGHT, stagger DOWN
      const primaryX = avgX + OFFSET_PRIMARY;
      const staggerY = avgY + siblings * OFFSET_CROSS;
      positions.set(nodeId, { x: primaryX - nodeW / 2, y: staggerY - nodeH / 2 });
    } else {
      // TB flow: place BELOW, stagger RIGHT
      const primaryY = avgY + OFFSET_PRIMARY;
      const staggerX = avgX + siblings * OFFSET_CROSS;
      positions.set(nodeId, { x: staggerX - nodeW / 2, y: primaryY - nodeH / 2 });
    }
    placed.add(nodeId);
  }

  // Phase 2: BFS — new nodes connected only to other new nodes
  // Inherit direction from the placed neighbor
  let frontier = [...placed];
  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const nodeId of frontier) {
      for (const neighborId of newToNew.get(nodeId) ?? []) {
        if (placed.has(neighborId)) continue;
        const anchorPos =
          positions.get(nodeId) ?? existingPositions.get(nodeId) ?? { x: 0, y: 0 };
        const nodeW = newDims.get(neighborId)?.w ?? 180;
        const nodeH = newDims.get(neighborId)?.h ?? 120;
        // Default BFS placement: continue TB (most common)
        positions.set(neighborId, {
          x: anchorPos.x + nodeW / 2 - nodeW / 2,
          y: anchorPos.y + nodeH / 2 + OFFSET_PRIMARY - nodeH / 2,
        });
        placed.add(neighborId);
        nextFrontier.push(neighborId);
      }
    }
    frontier = nextFrontier;
  }

  // Phase 3: Orphan new nodes — place to the right of everything
  const orphans = [...newNodeIds].filter((id) => !placed.has(id));
  if (orphans.length > 0) {
    let maxX = 0;
    for (const pos of existingPositions.values()) maxX = Math.max(maxX, pos.x);
    const startX = maxX + 300;
    for (let i = 0; i < orphans.length; i++) {
      positions.set(orphans[i], { x: startX, y: 100 + i * OFFSET_CROSS });
    }
  }

  return positions;
}

// ── Layout function ─────────────────────────────────────────────────
//
// For fresh generation: dagre positions all nodes.
// For modifications: dagre still runs on the full graph, but existing
// node positions are overridden with their actual canvas positions.
// NEW nodes use connection-based placement via computeNewNodePositions
// (above), which places them relative to the existing nodes they
// connect to — preserving the user's layout direction.
//
export function layoutArchitecture(
  arch: Architecture,
  existingPositions?: Map<string, { x: number; y: number }>,
): { nodes: Node<CanvasNodeData>[]; edges: Edge[] } {
  // Auto-detect direction from existing canvas positions when AI doesn't set it
  let rankdir = arch.direction;
  if (!rankdir && existingPositions && existingPositions.size > 0) {
    rankdir = detectDirectionFromPositions(existingPositions, arch.edges);
    console.log(`[Layout] Auto-detected direction: ${rankdir} from ${existingPositions.size} existing nodes`);
  }
  const finalRankdir = rankdir ?? "TB";
  const isHorizontal = finalRankdir === "LR" || finalRankdir === "RL";
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: finalRankdir, nodesep: 140, ranksep: isHorizontal ? 300 : 180 });
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

  // For modifications: compute connection-based positions for new nodes
  let newNodePositions: Map<string, { x: number; y: number }> | undefined;
  if (existingPositions && existingPositions.size > 0) {
    const newNodeIds = new Set(
      arch.nodes.filter((n) => !existingPositions.has(n.id)).map((n) => n.id),
    );
    if (newNodeIds.size > 0) {
      // Build dims map for new nodes (needed by computeNewNodePositions)
      const newDims = new Map<string, { w: number; h: number }>();
      for (const n of arch.nodes) {
        if (newNodeIds.has(n.id)) {
          const d = g.node(n.id);
          newDims.set(n.id, { w: d.width, h: d.height });
        }
      }
      newNodePositions = computeNewNodePositions(
        newNodeIds,
        arch.edges,
        existingPositions,
        newDims,
      );
    }
  }

  const nodes: Node<CanvasNodeData>[] = arch.nodes.map((n) => {
    const pos = g.node(n.id);
    const dims = g.node(n.id);
    const w = dims.width;
    const h = dims.height;

    // Position priority:
    //   1. Connection-based position (new nodes during modification)
    //   2. Existing canvas position (existing nodes during modification)
    //   3. Dagre position (fresh generation, or fallback)
    const connPos = newNodePositions?.get(n.id);
    const existing = existingPositions?.get(n.id);
    const dagrePosition = { x: pos.x - w / 2, y: pos.y - h / 2 };
    const finalPosition = connPos ?? existing ?? dagrePosition;

    return {
      id: n.id,
      type: "canvasNode",
      position: finalPosition,
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

  // Map edges with handle assignment — use node CENTERS for direction
  const centerMap = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const cx = n.position.x + (n.measured?.width ?? 0) / 2;
    const cy = n.position.y + (n.measured?.height ?? 0) / 2;
    centerMap.set(n.id, { x: cx, y: cy });
  }

  const edges: Edge[] = arch.edges.map((e) => {
    const sPos = centerMap.get(e.source) ?? { x: 0, y: 0 };
    const tPos = centerMap.get(e.target) ?? { x: 0, y: 0 };
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

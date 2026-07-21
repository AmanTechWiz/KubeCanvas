import dagre from "dagre";

// ── Types ──────────────────────────────────────────────────────────

interface CleanupNodeData {
  id: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

interface CleanupEdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

type RankDir = "TB" | "LR" | "BT" | "RL";

interface CleanupResult {
  positions: Map<string, { x: number; y: number }>;
  edgeHandles: Map<string, { sourceHandle: string; targetHandle: string }>;
  direction: RankDir;
}

// ── Direction detection ───────────────────────────────────────────
//
// Edge handles are the PRIMARY signal (3x weight). They encode
// explicit directional intent: bottom→top = TB, right→left = LR.
// Position deltas are a secondary signal (1x weight). This ensures
// the direction never flips randomly between runs.

function detectDirection(
  nodes: CleanupNodeData[],
  edges: CleanupEdgeData[],
): RankDir {
  let posHorizontal = 0;
  let posVertical = 0;
  let handleHorizontal = 0;
  let handleVertical = 0;

  const posMap = new Map(nodes.map((n) => [n.id, n.position]));

  for (const e of edges) {
    // Signal 1: Edge position delta (dx/dy between connected node centers)
    const src = posMap.get(e.source);
    const tgt = posMap.get(e.target);
    if (src && tgt) {
      const dx = Math.abs(tgt.x - src.x);
      const dy = Math.abs(tgt.y - src.y);
      if (dx >= dy) posHorizontal++;
      else posVertical++;
    }

    // Signal 2: Edge handle values (PRIMARY — 3x weight)
    const sh = e.sourceHandle?.toLowerCase();
    const th = e.targetHandle?.toLowerCase();
    if (sh && th) {
      if (
        (sh === "bottom" && th === "top") ||
        (sh === "top" && th === "bottom")
      ) {
        handleVertical++;
      }
      if (
        (sh === "right" && th === "left") ||
        (sh === "left" && th === "right")
      ) {
        handleHorizontal++;
      }
    }
  }

  // Weighted vote: handles are 3x — they reflect intent, not coincidence
  const totalHorizontal = posHorizontal + handleHorizontal * 3;
  const totalVertical = posVertical + handleVertical * 3;

  // No signals at all → fall back to bounding-box aspect ratio
  if (totalHorizontal === 0 && totalVertical === 0) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.position.x);
      maxX = Math.max(maxX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxY = Math.max(maxY, n.position.y);
    }
    return maxX - minX > maxY - minY ? "LR" : "TB";
  }

  return totalHorizontal >= totalVertical ? "LR" : "TB";
}

// ── Handle computation ────────────────────────────────────────────
//
// Given the rankdir and center positions of two connected nodes,
// determine which handles the edge should attach to. The direction
// aligns with the layout direction.

function computeHandles(
  srcCenter: { x: number; y: number },
  tgtCenter: { x: number; y: number },
  direction: RankDir,
): { sourceHandle: string; targetHandle: string } {
  const dx = tgtCenter.x - srcCenter.x;
  const dy = tgtCenter.y - srcCenter.y;

  switch (direction) {
    case "LR":
      return dx >= 0
        ? { sourceHandle: "right", targetHandle: "left" }
        : { sourceHandle: "left", targetHandle: "right" };
    case "RL":
      return dx <= 0
        ? { sourceHandle: "left", targetHandle: "right" }
        : { sourceHandle: "right", targetHandle: "left" };
    case "BT":
      return dy <= 0
        ? { sourceHandle: "top", targetHandle: "bottom" }
        : { sourceHandle: "bottom", targetHandle: "top" };
    case "TB":
    default:
      return dy >= 0
        ? { sourceHandle: "bottom", targetHandle: "top" }
        : { sourceHandle: "top", targetHandle: "bottom" };
  }
}

// ── Spacing calculator ────────────────────────────────────────────
//
// Larger graphs need more spacing to stay readable. Scales based on
// node count and max nodes in a single rank.

function computeSpacing(
  nodes: CleanupNodeData[],
  edges: CleanupEdgeData[],
  direction: RankDir,
): { nodesep: number; ranksep: number; marginx: number; marginy: number } {
  const count = nodes.length;
  const isHorizontal = direction === "LR" || direction === "RL";

  // Base spacing
  let nodesep = 120;
  let ranksep = 220;
  let marginx = 60;
  let marginy = 60;

  // Scale with node count
  if (count > 20) {
    nodesep = 160;
    ranksep = isHorizontal ? 340 : 280;
  } else if (count > 12) {
    nodesep = 150;
    ranksep = isHorizontal ? 320 : 250;
  } else if (count > 6) {
    nodesep = 140;
    ranksep = isHorizontal ? 300 : 230;
  }

  // Horizontal layouts need wider rank separation
  if (isHorizontal) {
    ranksep = Math.max(ranksep, 280);
  }

  return { nodesep, ranksep, marginx, marginy };
}

// ── Main cleanup function ─────────────────────────────────────────
//
// Accepts the current canvas nodes and edges, intelligently detects
// the layout direction from existing positions, runs dagre to compute
// clean positions, and returns the updated data.
//
// The direction is **not** forced to TB — it adapts to whatever the
// user has built (LR, TB, BT, RL). Spacing scales with graph size so
// large architectures don't look cramped.

export function cleanupCanvasLayout(
  nodes: CleanupNodeData[],
  edges: CleanupEdgeData[],
): CleanupResult {
  if (nodes.length === 0) {
    return { positions: new Map(), edgeHandles: new Map(), direction: "TB" };
  }

  // 1. Detect current layout direction from existing positions + handles
  const direction = detectDirection(nodes, edges);

  // 2. Compute spacing scaled to graph size
  const spacing = computeSpacing(nodes, edges, direction);

  // 3. Build dagre graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: spacing.nodesep,
    ranksep: spacing.ranksep,
    marginx: spacing.marginx,
    marginy: spacing.marginy,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, { width: n.width, height: n.height });
  }

  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  // 4. Run layout
  dagre.layout(g);

  // 5. Find min position to offset everything so no node goes negative
  let minX = Infinity,
    minY = Infinity;
  const rawPositions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const pos = g.node(n.id);
    const x = pos.x - n.width / 2;
    const y = pos.y - n.height / 2;
    rawPositions.set(n.id, { x, y });
    if (x < minX) minX = x;
    if (y < minY) minY = y;
  }

  // 6. Apply offset so the top-left node starts at (60, 60)
  const offsetX = Math.max(0, 60 - minX);
  const offsetY = Math.max(0, 60 - minY);
  const positions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const p = rawPositions.get(n.id)!;
    positions.set(n.id, {
      x: Math.round(p.x + offsetX),
      y: Math.round(p.y + offsetY),
    });
  }

  // 7. Build center-position map for handle computation
  const centers = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const p = positions.get(n.id)!;
    centers.set(n.id, {
      x: p.x + n.width / 2,
      y: p.y + n.height / 2,
    });
  }

  // 8. Compute edge handles from new positions (direction-aware)
  const edgeHandles = new Map<
    string,
    { sourceHandle: string; targetHandle: string }
  >();
  for (const e of edges) {
    const srcCenter = centers.get(e.source) ?? { x: 0, y: 0 };
    const tgtCenter = centers.get(e.target) ?? { x: 0, y: 0 };
    edgeHandles.set(
      e.id,
      computeHandles(srcCenter, tgtCenter, direction),
    );
  }

  return { positions, edgeHandles, direction };
}

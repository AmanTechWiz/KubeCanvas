import type { Architecture, ArchitectureNode, ArchitectureEdge } from "./architecture-schema";

// ── Validation Result ───────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  orphans: string[];
  duplicateNodes: string[];
  duplicateEdges: string[];
  missingRefs: string[];
  issues: string[];
}

// ── Validate Architecture ───────────────────────────────────────────
export function validateArchitecture(arch: Architecture): ValidationResult {
  const issues: string[] = [];
  const orphans: string[] = [];
  const duplicateNodes: string[] = [];
  const duplicateEdges: string[] = [];
  const missingRefs: string[] = [];

  // 1. Check for duplicate node IDs
  const nodeIds = new Set<string>();
  for (const n of arch.nodes) {
    if (nodeIds.has(n.id)) {
      duplicateNodes.push(n.id);
      issues.push(`Duplicate node ID: "${n.id}"`);
    }
    nodeIds.add(n.id);
  }

  // 2. Check for duplicate edge IDs
  const edgeIds = new Set<string>();
  for (const e of arch.edges) {
    if (edgeIds.has(e.id)) {
      duplicateEdges.push(e.id);
      issues.push(`Duplicate edge ID: "${e.id}"`);
    }
    edgeIds.add(e.id);
  }

  // 3. Check for missing node references in edges
  for (const e of arch.edges) {
    if (!nodeIds.has(e.source)) {
      missingRefs.push(e.source);
      issues.push(`Edge "${e.id}" references missing source node: "${e.source}"`);
    }
    if (!nodeIds.has(e.target)) {
      missingRefs.push(e.target);
      issues.push(`Edge "${e.id}" references missing target node: "${e.target}"`);
    }
  }

  // 4. Check for orphaned nodes (nodes with no edges)
  const connectedNodes = new Set<string>();
  for (const e of arch.edges) {
    if (nodeIds.has(e.source)) connectedNodes.add(e.source);
    if (nodeIds.has(e.target)) connectedNodes.add(e.target);
  }
  for (const n of arch.nodes) {
    if (!connectedNodes.has(n.id)) {
      orphans.push(n.id);
      issues.push(`Orphaned node: "${n.label}" (${n.id})`);
    }
  }

  return {
    valid: issues.length === 0,
    orphans,
    duplicateNodes,
    duplicateEdges,
    missingRefs,
    issues,
  };
}

// ── Repair: connect orphaned nodes ──────────────────────────────────
// Creates edges from orphans to the nearest node in the layer above.
export function repairOrphans(
  arch: Architecture,
  orphans: string[],
): ArchitectureEdge[] {
  const layerOrder = [
    "entry",
    "edge",
    "auth",
    "service",
    "async",
    "data",
    "external",
    "observability",
  ];

  const nodeById = new Map<string, ArchitectureNode>();
  for (const n of arch.nodes) nodeById.set(n.id, n);

  const newEdges: ArchitectureEdge[] = [];

  for (const orphanId of orphans) {
    const orphan = nodeById.get(orphanId);
    if (!orphan) continue;

    const orphanLayerIdx = layerOrder.indexOf(orphan.layer);

    // Find the closest node in the layer above
    let bestTarget: ArchitectureNode | null = null;
    let bestLayerDiff = Infinity;

    for (const n of arch.nodes) {
      if (n.id === orphanId) continue;
      const nLayerIdx = layerOrder.indexOf(n.layer);
      // Only connect to nodes in layers above or at the same layer
      if (nLayerIdx <= orphanLayerIdx) {
        const diff = orphanLayerIdx - nLayerIdx;
        if (diff < bestLayerDiff) {
          bestLayerDiff = diff;
          bestTarget = n;
        }
      }
    }

    if (bestTarget) {
      newEdges.push({
        id: `edge-repair-${orphanId}-${bestTarget.id}`,
        source: bestTarget.id,
        target: orphanId,
        label: "Connects",
      });
    }
  }

  return newEdges;
}

// ── Repair: deduplicate nodes (keep first occurrence) ────────────────
export function deduplicateNodes(arch: Architecture): Architecture {
  const seen = new Set<string>();
  const uniqueNodes: ArchitectureNode[] = [];
  for (const n of arch.nodes) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      uniqueNodes.push(n);
    }
  }

  const validNodeIds = new Set(uniqueNodes.map((n) => n.id));
  const uniqueEdges = arch.edges.filter(
    (e) =>
      !duplicateEdgeId(e.id, arch.edges) &&
      validNodeIds.has(e.source) &&
      validNodeIds.has(e.target),
  );

  return { nodes: uniqueNodes, edges: uniqueEdges };
}

function duplicateEdgeId(id: string, edges: ArchitectureEdge[]): boolean {
  let count = 0;
  for (const e of edges) {
    if (e.id === id) count++;
  }
  return count > 1;
}

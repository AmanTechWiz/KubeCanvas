import { task, metadata } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { generateSpecSection } from "./generate-spec-section";

// ── Canvas Data Extraction ──────────────────────────────────────────

interface CanvasNode {
  id: string;
  label: string;
  shape: string;
  color: string;
  logo: string | null;
  technology?: string;
  description?: string;
  layer?: string;
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label: string | null;
}

function extractArchitectureData(
  canvasJson: any
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  if (!canvasJson) {
    return { nodes: [], edges: [] };
  }

  const rawNodes = Array.isArray(canvasJson.nodes) ? canvasJson.nodes : [];
  const rawEdges = Array.isArray(canvasJson.edges) ? canvasJson.edges : [];

  const nodes = rawNodes.map((n: any) => ({
    id: n.id ?? "",
    label: n.data?.label ?? n.label ?? "",
    shape: n.data?.shape ?? "rectangle",
    color: n.data?.color ?? "#1F1F1F",
    logo: n.data?.logo ?? null,
    technology: n.data?.technology ?? undefined,
    description: n.data?.description ?? undefined,
    layer: n.data?.layer ?? undefined,
  }));

  const edges = rawEdges.map((e: any) => ({
    id: e.id ?? "",
    source: e.source ?? "",
    target: e.target ?? "",
    label: e.label ?? null,
  }));

  return { nodes, edges };
}

// ── Sections to Generate ────────────────────────────────────────────

const SECTIONS = [
  "architectureJson",
  "spec",
  "implementationPlan",
  "implementationQuestions",
  "implementationGuardrails",
  "instructions",
  "claudeMd",
] as const;

type SpecSection = (typeof SECTIONS)[number];

// ── Task ────────────────────────────────────────────────────────────

export const generateAiSpec = task({
  id: "generate-ai-spec",
  retry: { maxAttempts: 2 },
  run: async (payload: { projectId: string; userId: string; projectDescription?: string }) => {
    const { projectId, userId, projectDescription } = payload;

    console.log(`[AI Spec] Starting generation for project ${projectId}`);

    // ── Phase 1: Reading Architecture ──────────────────────────────
    metadata.set("phase", "reading");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { canvasJson: true, name: true },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const { nodes, edges } = extractArchitectureData(project.canvasJson);
    console.log(
      `[AI Spec] Read ${nodes.length} nodes, ${edges.length} edges from canvas`
    );

    if (nodes.length === 0) {
      throw new Error(
        "Canvas is empty — add some architecture components before exporting"
      );
    }

    // ── Phase 2: Analyzing Components ──────────────────────────────
    metadata.set("phase", "analyzing");

    const architectureData = JSON.stringify(
      {
        projectName: project.name,
        nodes,
        edges,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
      null,
      2
    );

    console.log(
      `[AI Spec] Architecture data prepared: ${architectureData.length} chars`
    );

    // ── Phase 3: Generating Specifications (parallel) ──────────────
    metadata.set("phase", "generating");

    console.log(`[AI Spec] Spawning ${SECTIONS.length} parallel generation tasks`);

    const results = await generateSpecSection.batchTriggerAndWait(
      SECTIONS.map((section) => ({
        payload: {
          section,
          architectureData,
          projectName: project.name,
          projectId,
          projectDescription,
        },
      }))
    );

    // Collect results — if any failed, we still proceed with partial results
    const files: Record<string, string> = {};
    const fileNames: Record<SpecSection, string> = {
      architectureJson: "architecture.json",
      spec: "SPEC.md",
      implementationPlan: "IMPLEMENTATION_PLAN.md",
      implementationQuestions: "IMPLEMENTATION_QUESTIONS.md",
      implementationGuardrails: "IMPLEMENTATION_GUARDRAILS.md",
      instructions: "AGENTS.md",
      claudeMd: "CLAUDE.md",
    };

    let successCount = 0;
    let failCount = 0;

    for (const result of results.runs) {
      if (result.ok) {
        const { section, content, label } = result.output;
        files[label] = content;
        successCount++;
        console.log(`[AI Spec] ✓ ${label}: ${content.length} chars`);
      } else {
        failCount++;
        console.error(`[AI Spec] ✗ Failed:`, result.error);
      }
    }

    console.log(
      `[AI Spec] Generation complete: ${successCount} succeeded, ${failCount} failed`
    );

    if (successCount === 0) {
      throw new Error("All generation tasks failed — cannot create export");
    }

    // ── Phase 4: Packaging Files ───────────────────────────────────
    metadata.set("phase", "packaging");

    const specExport = await prisma.specExport.create({
      data: {
        projectId,
        userId,
        files,
      },
    });

    console.log(`[AI Spec] SpecExport record created: ${specExport.id}`);

    // ── Phase 5: Complete ──────────────────────────────────────────
    metadata.set("phase", "complete");

    return {
      exportId: specExport.id,
      status: "completed" as const,
      filesGenerated: successCount,
      filesFailed: failCount,
    };
  },
});

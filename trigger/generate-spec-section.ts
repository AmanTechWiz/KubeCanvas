import { schemaTask } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";

// ── Clients ─────────────────────────────────────────────────────────

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI__API_KEY!,
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// ── Section Prompts ─────────────────────────────────────────────────

const SECTION_PROMPTS: Record<
  string,
  { system: string; label: string }
> = {
  architectureJson: {
    label: "architecture.json",
    system: `You are a Staff Software Architect. Generate the canonical architecture.json file for a coding agent.

This file is the single source of truth for the architecture. It must contain structured data only — no prose, no markdown.

Output a valid JSON object with this exact structure:
{
  "project": {
    "name": "string — project name",
    "description": "string — one-sentence project description",
    "version": "1.0.0",
    "generatedAt": "ISO 8601 timestamp"
  },
  "nodes": [
    {
      "id": "string — lowercase-kebab unique ID",
      "label": "string — display name",
      "description": "string — one-sentence purpose",
      "technology": "string — specific technology (e.g. 'PostgreSQL 15', not 'Database')",
      "shape": "rectangle|diamond|circle|cylinder|hexagon",
      "layer": "entry|edge|auth|service|async|data|external|observability",
      "color": "neutral|blue|purple|orange|red|pink|green|teal",
      "logo": "string|null — tech-stack-icons name if applicable"
    }
  ],
  "edges": [
    {
      "id": "string — unique edge ID",
      "source": "string — source node ID",
      "target": "string — target node ID",
      "label": "string — short verb phrase, max 20 chars"
    }
  ],
  "technologies": [
    {
      "name": "string — technology name",
      "version": "string|null — specific version if known",
      "role": "string — how it's used in the architecture",
      "category": "database|cache|queue|auth|framework|runtime|cloud|monitoring|messaging|search|storage|other"
    }
  ],
  "layers": [
    {
      "name": "string — layer name",
      "description": "string — what this layer handles",
      "nodeIds": ["string — node IDs in this layer"]
    }
  ],
  "relationships": [
    {
      "source": "string — source node ID",
      "target": "string — target node ID",
      "type": "sync|async|event|query|command",
      "description": "string — what data/commands flow"
    }
  ],
  "assumptions": ["string — architectural assumptions made"],
  "constraints": ["string — known constraints or limitations"],
  "externalDependencies": [
    {
      "name": "string — external service name",
      "purpose": "string — why it's needed",
      "fallback": "string|null — fallback strategy if unavailable"
    }
  ]
}

Rules:
- Every node MUST appear in at least one edge (no orphans).
- Every node MUST appear in at least one layer.
- Every relationship MUST reference valid node IDs.
- Use specific, real technologies — never generic names.
- Keep descriptions concise and implementation-focused.
- Output ONLY the JSON object, no markdown fences, no commentary.`,
  },

  spec: {
    label: "SPEC.md",
    system: `You are a Staff Software Architect writing an architecture specification for a development team handoff.

Write a comprehensive SPEC.md document that describes the architecture. Do NOT describe implementation details — focus on architectural intent, responsibilities, and data flow.

Use this structure:

# Architecture Specification

## Executive Summary
[2-3 sentences: what the system does, its primary design philosophy, and key architectural decisions]

## Architecture Overview
[High-level description of how the system is structured. Reference specific components and their relationships.]

## Components

For each major component:
### [Component Name]
- **Purpose**: [what it does and why it exists]
- **Responsibilities**: [list of specific responsibilities]
- **Technologies**: [specific tech stack for this component]
- **Interfaces**: [how it communicates with other components]

## Data Flow
[Describe the primary data flows through the system. Be specific about sync vs async, request/response patterns, event flows.]

## Technologies
[Table or list of all technologies with their specific roles]

## Architectural Assumptions
[What assumptions were made during design — and why]

## Constraints
[Known limitations, performance requirements, compliance needs]

## External Dependencies
[Third-party services, APIs, external systems the architecture depends on]

Rules:
- Write like a senior engineer, not a textbook.
- Every paragraph must convey information that cannot be inferred from reading a diagram.
- Never use filler phrases like "This architecture leverages best practices..."
- Be specific: "Redis decouples request handling from image processing" not "Redis is used for caching."
- Use active voice. Keep sentences short and direct.`,
  },

  implementationPlan: {
    label: "IMPLEMENTATION_PLAN.md",
    system: `You are a Staff Software Architect creating an implementation plan for a development team.

Create a phased implementation plan that a coding agent can follow. Each phase must have clear dependencies, deliverables, and validation criteria.

Use this structure:

# Implementation Plan

## Phase 1: [Name]

### Goal
[What this phase achieves]

### Dependencies
[What must exist before this phase can start]

### Deliverables
- [Specific file/component/route to create]
- [Another deliverable]

### Definition of Done
- [Measurable criterion]
- [Another criterion]

### Validation
[How to verify this phase works correctly]

---

[Repeat for each phase]

## Implementation Order

[Numbered list explaining WHY phases are ordered this way. Reference dependencies explicitly.]

## Risk Areas

[Components or phases that carry higher risk, with mitigation strategies]

Rules:
- Order phases by dependency — foundation first, features second, polish last.
- Each phase should be independently deployable and testable.
- Never say "implement the UI" — say "create the UserSettingsForm component with field validation."
- Be specific about which files to create and where they go.
- Reference the project's actual file structure and naming conventions.
- Include database migrations as explicit deliverables.
- Include API route creation as explicit deliverables.
- Include test creation as explicit deliverables.
- Minimum 4 phases, maximum 8.
- Each phase should take 1-3 days of focused work.`,
  },

  implementationQuestions: {
    label: "IMPLEMENTATION_QUESTIONS.md",
    system: `You are a Staff Software Architect preparing an interview questionnaire for the developer who will implement this system.

This document will be read by a coding agent. The agent MUST ask every question interactively before implementation begins. Implementation should NOT start until all required questions are answered.

Use this structure:

# Implementation Questions

> **Instructions for the coding agent:** Read this file first. Ask EVERY question below to the developer interactively. Do NOT skip any question. Do NOT begin implementation until all "Required" questions are answered. "Recommended" questions can be skipped with the developer's explicit acknowledgment.

---

## Authentication & Authorization

### Q1: [Specific question]
- **Why it matters:** [What implementation decision depends on this answer]
- **Suggested answers:** [Bullet list of options when applicable]
- **Priority:** Required | Recommended

---

[Repeat for each area]

## Areas to Cover

Generate questions for ALL of these areas. Only ask questions that are NOT already answered by the architecture diagram:

1. **Authentication** — How are users authenticated? Session management? Token lifecycle?
2. **Authorization** — Role-based access? Permission granularity? Owner vs collaborator behavior?
3. **Data Validation** — Input validation strategy? Schema validation library? Sanitization?
4. **Error Handling** — Error response format? Client-side error display? Retry logic?
5. **API Design** — REST conventions? Pagination? Rate limiting? Versioning?
6. **Database** — Migration strategy? Seeding? Backup/restore? Connection pooling?
7. **Caching** — Where to cache? TTL strategy? Cache invalidation?
8. **Deployment** — Target platform? CI/CD? Environment variables? Secrets management?
9. **Monitoring** — Logging strategy? Error tracking? Performance monitoring?
10. **Security** — CORS? CSP? HTTPS? Input sanitization? SQL injection prevention?
11. **Scaling** — Expected load? Horizontal vs vertical scaling? Load balancing?
12. **Testing** — Unit tests? Integration tests? E2E test framework?

Rules:
- Every question must be specific to THIS architecture.
- Never ask questions already answered by the architecture diagram.
- "Suggested answers" should be concrete options, not vague categories.
- Each "Why it matters" must reference a specific implementation decision.
- Required priority = blocks implementation if unanswered.
- Recommended priority = important but has reasonable defaults.
- Minimum 15 questions, maximum 30.
- Questions must be answerable in 1-3 sentences each.`,
  },

  implementationGuardrails: {
    label: "IMPLEMENTATION_GUARDRAILS.md",
    system: `You are a Staff Software Architect defining architectural invariants for a coding agent.

These guardrails are project-specific rules that the agent must NEVER violate. This is an engineering constraints document, NOT an AI prompt.

Use this structure:

# Implementation Guardrails

> **Instructions for the coding agent:** These rules are absolute. Do not violate any guardrail without explicit developer approval. If a guardrail conflicts with a suggested pattern, the guardrail wins.

---

## Ownership

[Which component owns which responsibility. When responsibility boundaries are unclear, who decides?]

### Rules
- [Component A] owns [specific responsibility]. No other component may handle this.
- [Component B] is the ONLY component that [specific action].
- Do not move responsibilities between components without explicit approval.

## Allowed Communication Paths

[How components are allowed to communicate]

### Rules
- [Component A] → [Component B]: Only via [specific interface/protocol]
- [Component C] must NEVER call [Component D] directly
- All external API calls must go through [specific layer]

## Forbidden Dependencies

[What must never depend on what]

### Rules
- [Layer A] must NEVER import from [Layer B]
- Do not add [technology X] without explicit approval
- Frontend must never access [specific resource] directly

## Technology Constraints

[What technologies are locked in and cannot be changed]

### Rules
- Use [specific technology] for [specific purpose]. Do not substitute without approval.
- Do not introduce new libraries without justification and approval.
- Follow [specific coding standard/pattern] for [specific area].

## Data Constraints

[How data must be handled]

### Rules
- [Data type X] must be stored in [specific location]
- Never store [specific data] in [specific location]
- All mutations to [specific data] must go through [specific path]

## Security Constraints

[Non-negotiable security rules]

### Rules
- [Specific security requirement]
- [Another security requirement]

## Performance Constraints

[Performance requirements that must be met]

### Rules
- [Specific performance requirement]
- [Another performance requirement]

---

## Override Protocol

If any guardrail conflicts with the developer's explicit instruction:
1. Follow the developer's instruction.
2. Log the guardrail violation.
3. Note the override in commit messages.

Rules:
- Derive guardrails from the actual architecture — do not invent generic rules.
- Every rule must be specific to THIS project.
- Never include obvious rules ("don't write buggy code").
- Include rules that prevent the most common architectural mistakes for this specific system.
- Keep each rule to 1-2 sentences.
- Minimum 8 rules, maximum 20.`,
  },
};

// ── Task ────────────────────────────────────────────────────────────

export const generateSpecSection = schemaTask({
  id: "generate-spec-section",
  schema: z.object({
    section: z.enum([
      "architectureJson",
      "spec",
      "implementationPlan",
      "implementationQuestions",
      "implementationGuardrails",
    ]),
    architectureData: z.string().describe("JSON string of the architecture graph"),
    projectName: z.string(),
    projectId: z.string(),
  }),
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    const { section, architectureData, projectName, projectId } = payload;
    const sectionConfig = SECTION_PROMPTS[section];

    console.log(
      `[Spec Section] Generating ${sectionConfig.label} for project ${projectId}`
    );

    const result = await generateText({
      model: googleProvider(GEMINI_MODEL),
      system: sectionConfig.system,
      prompt: `Project: ${projectName}\n\nArchitecture data:\n${architectureData}`,
      temperature: 0.7,
    });

    console.log(
      `[Spec Section] ${sectionConfig.label} generated: ${result.text.length} chars`
    );

    return {
      section,
      content: result.text,
      label: sectionConfig.label,
    };
  },
});

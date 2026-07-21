# Architecture Context

## Stack

| Layer              | Technology                        | Role                                                    |
| ------------------ | --------------------------------- | ------------------------------------------------------- |
| Framework          | Next.js 17 + TypeScript           | Full-stack app with server/client boundaries            |
| UI                 | Tailwind v4 + shadcn/ui           | Component composition and styling                       |
| Auth               | Clerk                             | User identity and route protection                      |
| Database           | Prisma + PostgreSQL               | Relational metadata: projects, collaborators, specs     |
| Canvas state sync  | Liveblocks + React Flow           | Real-time collaborative canvas, presence, and cursors   |
| Canvas persistence | Prisma (`canvasJson` JSON field)  | Durable snapshot of canvas state (autosave every 2s)    |
| Background tasks   | Trigger.dev                       | Durable AI generation workflows                         |
| AI / LLM           | Gemini 2.0 Flash via AI SDK v7    | Chat agent, architecture generation, natural summaries  |
| Layout engine      | dagre                             | Directed graph layout for canvas cleanup & AI placement |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, architecture schema, canvas layout utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `hooks` — React hooks: autosave, canvas history (snapshot undo/redo), keyboard shortcuts, project actions.
- `prisma` — Database schema and generated client output.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

### Two-Layer Canvas Storage

- **Liveblocks Storage (working memory)**: real-time collaborative state via CRDTs. All users see changes instantly. Nodes and edges are stored as `LiveObject` maps inside a `LiveblocksFlow` structure.
- **Prisma `canvasJson` (durable snapshot)**: autosave writes the current Liveblocks state to the `Project.canvasJson` JSON field every 2 seconds (debounced). On editor load, stale rooms are seeded from this snapshot. This is the source of truth for server-side reads (AI chat, export).

| Aspect          | Liveblocks Storage   | Prisma `canvasJson`        |
| --------------- | -------------------- | -------------------------- |
| Speed           | Instant (CRDT sync)  | ~50-200ms read/write       |
| Freshness       | Always current       | Up to 2s stale             |
| Server access   | Via REST API         | Direct Prisma query        |
| Persistence     | Ephemeral (TTL)      | Permanent                  |
| Use case        | Real-time editing    | Autosave, server context   |

### Spec Storage

- Generated Markdown specs are saved as files linked via the database.
- Spec records and file paths stored in PostgreSQL.

## Data Flow Rules

- **DB read** for repeated server-side work (AI chat) — avoids passing 50-100KB canvas JSON on every request.
- **Client pass** for exact live state (canvas validation, export) — needs current React Flow state, not stale snapshot.
- AI chat reads from Prisma `canvasJson` — close enough for LLM context, avoids payload bloat.
- Canvas validation/export reads from `useReactFlow()` — needs exact current state, runs once per click.
- React Flow is client-only; server cannot call `useReactFlow()`. Bridge between client and server is always a data layer (database, API, or props).

## Auth and Collaboration Model

- Every project has a single owner (Clerk user ID).
- Projects can include additional collaborators (stored by email).
- Only authenticated users can access protected routes.
- Only the owner or a collaborator can mutate project resources.
- Liveblocks room tokens are issued only after verifying project membership.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Architecture

### Design Agent (Trigger.dev)

- **Execution**: durable background task via Trigger.dev, runs for minutes without timeout.
- **Architecture**: tool-based — 9 tools (`addNode`, `moveNode`, `updateNode`, `deleteNode`, `deleteAllNodes`, `addEdge`, `updateEdge`, `deleteEdge`, `moveMultipleNodes`) executed directly on Liveblocks Storage via `mutateFlow()` with `serial()` queue.
- **AI cursor**: wobble animation at each operation site via Liveblocks Presence REST API.
- **Direction awareness**: model outputs `direction` field (TB/LR/BT/RL) via Zod schema; `layoutArchitecture()` uses dagre with the requested rankdir; during modifications, per-anchor direction inference preserves existing layout.
- **Position preservation**: existing nodes keep their positions during modifications — only new nodes are placed intelligently via `computeNewNodePositions()` (connected nodes relative to their anchor, orphans to the right).
- **Natural summaries**: agent returns a human-readable `summary` string via `generateNaturalSummary()` LLM call — e.g. "I've added a Redis cache between the API Gateway and your services."
- **Canvas snapshot integration**: pre-AI state captured as a canvas "photo" before modification (via `useCanvasHistory` hook). Users can undo any AI run with ⌘Z.
- **Phase tracking**: `metadata.set("phase", ...)` at each step (reading, generating, applying, complete) for frontend status display.
- `stopWhen: stepCountIs(30)` limits tool call steps.

### Unified Chat Agent

- Single AI SDK v7 `streamText` route with one `generateArchitecture` tool.
- Model decides when to call the tool (modify canvas) vs respond with text (discuss architecture).
- Canvas context injected via Prisma `canvasJson` snapshot at request time.
- Sliding window: last 30 messages sent to LLM.
- Topic-locked to system design / infrastructure / databases / cloud.
- Prompt injection protection at both regex and system prompt levels.

### Spec Generation

- Input: current canvas graph and project context.
- Execution: durable background task via Trigger.dev.
- Output: Markdown technical spec saved to the database and linked to the project.

## Canvas Cleanup & Layout

- **`lib/canvas-cleanup.ts`**: standalone dagre-based layout utility for the "cleanup" button in the canvas toolbar.
- **Direction detection**: edge handle orientation given 3x weight, position deltas 1x weight — handles encode explicit intent (bottom→top = TB, right→left = LR) and prevent direction from flipping randomly.
- **Scaling**: spacing (nodesep/ranksep) scales with graph size — 4 tiers from 1–6 to 20+ nodes ensure small graphs stay tight and large architectures don't look cramped.
- **Handle computation**: direction-aware — TB layout puts source at bottom and target at top; LR puts source at right and target at left.
- **Auto-offset**: after dagre runs, all positions shifted so top-left node starts at (60,60).
- **Auto-fit**: `fitView({ duration: 300, padding: 0.2 })` triggers after cleanup.

## Canvas Snapshot History (Photo Album)

- **Problem**: Liveblocks native undo is client-local — it only records the local browser's ops. Server-side AI mutations and collaborator edits are invisible to it, and stale inverse ops corrupt the canvas when replayed across AI edits.
- **Solution**: App-level snapshot history (`hooks/use-canvas-history.ts`) replaces client undo/redo. Every settled change (human gesture, template import, Clear All, collaborator edit, or full AI run) becomes one undoable canvas photo.
- **Boundary detection**: AI runs are captured via `agentThinking` Storage flag — pre-AI snapshot pushed when `agentThinking` transitions `false → true`; post-AI snapshot pushed on completion.
- **Restore safety**: undo/redo call `history.disable(() => restoreMutation(snapshot))` so old and new states never overlap on Liveblocks' native stack.
- **System mutations excluded**: CanvasLoader, cleanup, edge migration do not create snapshots.
- Capacity: 50 snapshots max (FIFO).

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata (database) and generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
6. Canvas state is dual-layer: Liveblocks for real-time collaboration, Prisma for durable persistence.
7. Server-side code reads canvas from Prisma; client-side code reads from React Flow context.

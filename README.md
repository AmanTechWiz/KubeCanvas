# KubeCanvas

A real-time collaborative system design workspace. Describe a system in plain English, an AI agent builds it on a shared canvas, collaborators refine the architecture, and export a technical spec.

## Tech Stack

Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui · Liveblocks · React Flow · Clerk · Prisma/PostgreSQL · Trigger.dev · AI SDK v7 · Gemini 2.0 Flash · dagre

## What's Done

- **Auth & Projects** — Clerk sign-in/sign-up, project CRUD, collaborator invites with role-based access
- **Real-time Canvas** — Liveblocks-powered shared canvas with React Flow: drag shapes, resize, connect nodes, color toolbar, inline label editing
- **Presence & Cursors** — Live cursors, collaborator avatars, AI agent cursor with thinking animation
- **Shape System** — 6 shapes (rectangle, diamond, circle, cylinder, hexagon, pill) with drag-from-panel, shape preview ghost, per-shape rendering, and 690+ tech logo support
- **Canvas Controls** — Zoom, fit view, undo/redo, delete selected, Clear All with confirmation
- **Canvas Cleanup** — Dagre-powered layout cleanup with intelligent direction detection (LR/TB/BT/RL), graph-size-scaled spacing, direction-aware edge routing
- **Snapshot Undo/Redo** — App-level canvas photo history: every AI run, template import, and edit is one undoable snapshot (replaces Liveblocks client-local undo)
- **Starter Templates** — 3 pre-built architecture templates (Microservices, CI/CD Pipeline, Event-Driven) with SVG previews and one-click import
- **Autosave** — Debounced canvas persistence to Prisma (PostgreSQL) with manual save button and status indicator
- **Unified AI Agent** — Single chat interface that can both discuss architecture AND generate canvas modifications — model decides when to call the build tool vs respond with text
- **AI Architect** — Tool-based background agent (Trigger.dev) with 9 tools (addNode, moveNode, updateNode, deleteNode, addEdge, updateEdge, deleteEdge, moveMultipleNodes, deleteAllNodes) — writes directly to Liveblocks Storage
- **AI Cursor & Thinking** — AI agent cursor with wobble animation at operation sites, shared status feed across collaborators, dynamic phase indicators
- **Natural Summaries** — LLM-generated conversational summaries of AI changes (e.g. "I've added a Redis cache between the API Gateway and your services.")
- **Position Preservation** — AI modifications preserve existing node layout and direction; only new nodes are placed intelligently
- **Design System** — Glassmorphism UI with dark theme, shadcn/ui components, custom floating panels, liquid glass navbar
- **Spec Generation** — Trigger.dev background task that converts canvas state into a downloadable Markdown technical spec

## What's Planned

- **Performance** — Canvas rendering optimization, faster AI response times, edge case handling
- **AI Memory** — Store design decisions, user preferences, and rationale across sessions
- **Shared Chat History** — Persist architect responses across collaborators and reloads
- **CI/CD Pipeline** — GitHub Actions for lint → typecheck → build → deploy
- **Production Deployment** — Vercel/Railway hosting, Prisma migration strategy, environment variable audit

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

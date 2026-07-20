# KubeCanvas

A real-time collaborative system design workspace. Describe a system in plain English, an AI agent builds it on a shared canvas, collaborators refine the architecture, and export a technical spec.

## Tech Stack

Next.js 16 · Liveblocks · React Flow · Clerk · Prisma/PostgreSQL · Trigger.dev · Gemini · Vercel

## What's Done

- **Auth & Projects** — Clerk sign-in/sign-up, project CRUD, collaborator invites with role-based access
- **Real-time Canvas** — Liveblocks-powered shared canvas with React Flow: drag shapes, resize, connect nodes, color toolbar, inline label editing
- **Presence & Cursors** — Live cursors, collaborator avatars, AI agent cursor with thinking animation
- **Shape System** — 6 shapes (rectangle, diamond, circle, cylinder, hexagon, pill) with drag-from-panel, shape preview ghost, per-shape rendering, and tech logo support
- **Canvas Controls** — Zoom, fit view, undo/redo, delete selected, Clear All with confirmation
- **Starter Templates** — 3 pre-built architecture templates (Microservices, CI/CD Pipeline, Event-Driven) with SVG previews and one-click import
- **Autosave** — Debounced canvas persistence to Vercel Blob with manual save button and status indicator
- **AI Chat** — Canvas-aware conversational agent that can see your current design and discuss architecture decisions (streaming responses)
- **AI Architect** — Background design agent (Trigger.dev) that generates nodes and edges on the canvas from natural language prompts
- **AI Activity** — Shared status feed across collaborators, dynamic phase indicators, spiral spinner during generation
- **Design System** — Glassmorphism UI with dark theme, shadcn/ui components, custom floating panels
- **Specs Tab** — Placeholder for future spec generation from canvas state

## What's Planned

- **Unified AI Agent** — Merge chat and architect into one agent that can discuss AND build on the canvas in a single conversation
- **AI Memory** — Store design decisions, user preferences, and rationale across sessions so the AI remembers context
- **Spec Generation** — Convert the canvas graph into a downloadable Markdown technical specification
- **Spec Download** — Export specs as a ZIP folder ready to paste into a project
- **Improved Canvas Mutations** — Smarter layout, fewer orphan nodes, better edge routing from the AI architect (investigated dagre alternatives: ELK.js, position preservation, handle routing fixes)
- **Shared Chat History** — Persist architect responses so they're visible across collaborators and reloads
- **Performance** — Canvas rendering optimization, faster AI response times, edge case handling

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

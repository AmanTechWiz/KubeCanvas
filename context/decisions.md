# Engineering Decisions

Record significant architectural, design, and technical decisions here.
Updated after each meaningful implementation change.

---

## Stack

| Layer | Technology | Role |
|---|---|---|
| Framework | Next.js 16 + TypeScript | Full-stack app with server/client boundaries |
| UI | Tailwind v4 + shadcn/ui | Component composition and styling |
| Auth | Clerk | User identity and route protection |
| Database | Prisma + PostgreSQL | Relational metadata: projects, collaborators, specs, task runs |
| Canvas | Liveblocks + React Flow | Real-time collaborative canvas, presence, and cursors |
| Background tasks | Trigger.dev | Durable AI generation workflows |
| AI | Gemini 2.0 Flash via `@ai-sdk/google` | LLM for chat and architecture generation |
| AI SDK | AI SDK v7 (`ai@7.0.11`, `@ai-sdk/react@4.0.12`) | Streaming chat, tool calling, structured output |

---

## Styling & UI

- Tailwind v4 with `@import "tailwindcss"` syntax (not v3 directives)
- shadcn/ui components in `components/ui/` are protected foundation — do not modify after installation
- Dark-only theme: `:root` contains dark values directly, no `.dark` class toggling
- Brand colors mapped to shadcn/ui CSS variables: `--primary` = cyan (#00c8d4), `--accent` = indigo-purple (#6457f9)
- Use CSS custom property tokens from `globals.css` — no raw Tailwind color classes like `zinc-*` or hardcoded hex values
- Reference tokens via Tailwind utility names: `bg-base`, `text-copy-primary`, `border-surface-border`, `text-brand`
- Border radius scale: `rounded-xl` for small elements, `rounded-2xl` for cards, `rounded-3xl` for modals
- Auth pages use inline `style` props with CSS variables instead of Tailwind color utilities (Tailwind v4 semantic classes like `bg-background` don't resolve visually)

---

## Editor Chrome

- Editor chrome components live in `components/editor/`
- Sidebar uses floating overlay pattern — slides over canvas, does not push content
- Editor route at `/editor` with its own layout; main site `/` is standalone
- Shape panel is a floating pill toolbar at bottom-center of canvas, styled with glassmorphism
- Canvas controls bar positioned at `bottom-20` (above shape panel) with `z-[61]`

---

## Auth & Collaboration

- Clerk auth via `proxy.ts` (not middleware.ts) — public routes defined by sign-in/sign-up env vars
- Clerk dark theme appearance with CSS variable overrides for seamless integration
- Do NOT import from `@clerk/ui` in application code — triggers Clerk's bundled UI portal mode
- Clerk components use `routing="hash"` for in-modal authentication without page navigation
- Auth modal uses click event interception (capture phase) on Clerk container to prevent internal navigation
- Liveblocks uses access token authentication (`prepareSession` + `session.allow` + `session.authorize`)
- Liveblocks room ID = project ID (cuid) — private rooms with `defaultAccesses: []`
- Cursor colors deterministically derived from user ID using a fixed 16-color palette hash
- Liveblocks Node client cached as singleton in `lib/liveblocks.ts`

---

## Canvas Architecture

### Data Model

- `LiveblocksFlow<CanvasNode, CanvasEdge>` is the Storage type for the React Flow diagram
- Canvas wrapper (`canvas-editor.tsx`) owns the full Liveblocks room lifecycle — providers not hoisted to layout
- Loose connection mode (`ConnectionMode.Loose`) — any node can connect to any node
- `snapToGrid` + `snapGrid={[10, 10]}` for aligned edge routing

### Node System

- 6 shapes: rectangle, diamond, circle, pill, cylinder, hexagon
- Node color palette: 8 color pairs (dark bg + vivid text) in `types/canvas.ts` as `NODE_COLORS`
- Default node color: neutral dark (`#1F1F1F` bg, `#EDEDED` text); visible default for new nodes: indigo (`#6457f9`)
- Node IDs generated from shape name + timestamp + counter (`{shape}-{ts}-{n}`)
- Node creation uses Liveblocks `useMutation` to write directly to Storage
- One-shot `cleanupMutation` runs on mount to fix broken nodes in Storage
- `clearNodesMutation` removes all nodes from `flow.nodes` LiveMap
- Shape definitions live in `lib/canvas-shapes.ts` — shape name, default width/height, drag payload serialization

### Connection Handles

- Bidirectional handles — every side (Top, Bottom, Left, Right) has both source and target handles
- Handles are direct children of the node div (no `<span>` wrappers) — React Flow positions them correctly
- `connectionRadius={40}` for generous snap zone

### Edge Rendering

- Custom edges always use `getSmoothStepPath` for right-angle routing (borderRadius: 8)
- `EdgeLabelRenderer` positions labels at path midpoint coordinates from `getSmoothStepPath`
- Edge hit-area via React Flow's `interactionWidth={20}` on `BaseEdge`
- Edge arrow rendered by React Flow's `MarkerType.ArrowClosed` via `markerEnd`
- `defaultEdgeOptions` on ReactFlow sets custom `canvasEdge` type + arrow marker for all new connections

### Node Editing

- Node resizing uses React Flow built-in `NodeResizer` (8 corner/edge handles), minimum 60×40px
- Inline label editing: double-click triggers `<textarea>` overlay; `updateNode()` writes to Liveblocks Storage
- Floating color toolbar renders above selected nodes when selected; `textColor` stored in `CanvasNodeData`
- `useReactFlow()` available inside custom nodes for `updateNode()` — works with Liveblocks Flow sync

---

## Canvas Data Flow

### Liveblocks Storage vs Prisma

- **Liveblocks Storage** = working memory (fast, real-time, shared across collaborators)
- **Prisma** = hard drive (durable snapshot, server-readable, backup of truth)
- `useAutosave` periodically writes Liveblocks state to Prisma `canvasJson` field (debounced 2s)

### Client vs Server Decision Rule

- **DB read** for repeated server-side work (AI chat) — avoid passing 50-100KB canvas JSON on every request
- **Client pass** for exact live state (validation, export) — needs current React Flow state, not stale snapshot
- AI chat reads from Prisma (`canvasJson` field) — context is "close enough" for LLM, avoids payload bloat
- Validation/export reads from `useReactFlow()` — needs exact current state, runs once per click

### React Flow Is Client-Only

- React Flow depends on the DOM — `useReactFlow()` reads from a React Context only available in the browser
- Server components / API routes cannot use React Flow hooks
- Bridge between client and server is always a data layer (database, API, or props)

---

## AI Architecture

### Unified Chat + Architect Agent

- Single unified system prompt (`trigger/ai_system_prompt.ts`) combines chat discussion and architect modification modes
- Model decides when to call `generateArchitecture` tool vs respond with text
- Chat API route: `streamText` + single `generateArchitecture` tool + `createUIMessageStreamResponse` + `toUIMessageStream`

### Design Agent (Trigger.dev)

- Tool-based architecture: 9 tools (`addNode`, `moveNode`, `updateNode`, `deleteNode`, `deleteAllNodes`, `addEdge`, `updateEdge`, `deleteEdge`, `moveMultipleNodes`)
- Tools execute directly on Liveblocks Storage via `mutateFlow()` with `serial()` queue
- AI cursor moves to operation site with wobble animation via Liveblocks Presence
- `stopWhen: stepCountIs(30)` limits tool call steps
- Reads current canvas from Liveblocks REST API; applies changes via JSON Patch
- Phase tracking via `metadata.set("phase", ...)` for frontend phase display

### Chat API

- Canvas state read from Prisma `canvasJson` (not Liveblocks CRDT) — guaranteed simple `{ nodes[], edges[] }` structure
- Sliding window: `messages.slice(-30)` sends only last 30 messages to LLM
- Chat persistence: localStorage for per-tab, Prisma `ChatMessage` for cross-device
- Guardrails: topic lock to system design/infrastructure/databases/cloud + prompt injection protection
- Off-topic questions redirected at two levels: `validateTopic()` regex check + LLM system prompt

### Detection Model (Validation Engine)

- **Label/text first, logo second** — most people label their nodes with text, even if they skip logos
- Shape and color are aesthetic choices, NOT semantic — a database can be a pink circle
- Logo is a strong secondary signal (99% reliable when present)
- If any node can't be classified by label or logo → refuse to validate entirely
- No guessing, no partial results — honesty over false confidence

### Validation Broadcast

- Validation results shared across collaborators via Liveblocks `broadcastEvent` (not Storage)
- Results are transient — broadcast keeps it simple, no persistent storage needed
- Validation logic is deterministic: same nodes + same edges = same score
- Running once is enough; broadcast avoids making everyone click independently

---

## Real-Time Collaboration

### Liveblocks Feeds

- `FeedMessageData` is a discriminated union on `kind` field: `"status"` for AI activity, `"chat"` for collaborative chat
- Each feed (ai-status-feed, ai-chat) uses its own feed ID but shares the same FeedProvider
- `FeedContext` provides both status and chat feed operations — lives inside `FlowCanvas`/`RoomProvider`

### Cursor Sync

- Live cursors rendered inside `<ReactFlow>` at `z-[62]`
- Cursor positions stored as flow coordinates in Liveblocks presence
- Broadcast via document-level `mousemove` + `pointermove` listeners (throttled 50ms) — both needed because React Flow uses `setPointerCapture()` during node drag
- Viewport tracked via `onMove` callback for flow → screen coordinate conversion
- Badge text color computed via sRGB relative luminance (`contrastingTextColor()`)

### Presence

- Liveblocks Presence includes `isThinking: boolean` and `agentCursor: { x, y } | null`
- AI agent cursor stored in Liveblocks Storage (primary) + REST API presence (secondary fallback)

---

## Shape Drag & Drop

- Shape drag uses HTML5 native drag-and-drop (`dataTransfer` with `application/x-kubecanvas-shape` MIME type)
- Shape panel buttons use 1×1px transparent drag image (`setDragImage`) to suppress browser ghost
- Custom `ShapeDragPreview` renders full-size shape ghost at `position: fixed` `z-[9999]`
- Payload captured during `dragstart` into a ref because `dataTransfer.getData()` only works during `drop`
- Native DOM listeners on `.react-flow` element as fallback for browsers where synthetic events don't fire
- Logo drag uses separate MIME type (`application/x-kubecanvas-logo`) with same ghost preview system

---

## AI Sidebar UX

### Tool State Normalization
- `normalizeToolStates()` upgrades stale `input-streaming`/`input-available` tool states to `output-available` on message load (Prisma + localStorage)
- Prevents spinner flash on chat reload — previously, reloaded messages showed stale tool states that never resolved
- Fallback output `{ requiresConfirmation: true }` ensures confirm card renders correctly

### Revert Confirmation Flow
- Two-path revert: `onRevert` (direct, for cancel flow) and `onRevertRequest` (shows confirmation dialog)
- Confirmation dialog rendered via `ReactDOM.createPortal` to `document.body` with glassy styling
- Backdrop click and Escape dismiss the dialog; Revert sends `POST /api/ai/design/revert`

### Sidebar Animation
- Slide-out transition using `closing`/`mounted` states with 250ms `cubic-bezier(0.32,0.72,0,1)` ease
- `handleClose()` delays `onClose` callback until animation completes (260ms)
- Open animation on first mount via `requestAnimationFrame`

### Floating AI Button
- Custom `robot.png` image instead of lucide `Sparkles` icon
- Glassy styling with hover: `scale-110`, purple glow shadow, border brightening
- `ai-pulse` CSS keyframe for outer glow ring; respects `prefers-reduced-motion`

### Scrollbar
- Global thin scrollbar: `scrollbar-width: thin`, `scrollbar-color: rgba(255,255,255,0.08) transparent`
- WebKit: 6px width, transparent track, white/8% thumb with `border-radius: 999px`

---

## Technology Logo System

- `tech-stack-icons` package provides 690+ SVG icons
- `lib/logo-data.ts` has 15 data-driven categories with typed `LogoCategory`/`LogoDefinition` interfaces
- Custom SVG support (`customSvg?: string`) for icons not in tech-stack-icons (e.g. Kafka)
- Logo picker: floating glassmorphism panel with tabbed categories, instant search, 5-column grid
- Node renderer shows `StackIcon` above label when `logo` is set (flex-col layout)
- Logo validation in design agent: strips unknown logos before applying to canvas

---

## Starter Templates

- Prebuilt templates stored as static canvas snapshots in `components/editor/starter-templates.ts`
- Templates loaded into active Liveblocks room via `importMutation` (clears all, then adds template nodes/edges)
- Template edges use explicit `sourceHandle`/`targetHandle` values for clean directional connections
- 3 templates: Microservices, CI/CD Pipeline, Event-Driven
- Templates do not require database record — resolved by template ID at import time

---

## Package Manager

- bun for package management: `bun install`, `bun run dev`, `bun run build`
- Removed `"packageManager"` field from `package.json` and deleted `pnpm-lock.yaml`

---

## Keyboard Shortcuts

- `window`-level `keydown` listener with editable-field guard (INPUT, TEXTAREA, SELECT, contentEditable, ARIA roles)
- Shortcuts: `+`/`=` zoom in, `-` zoom out, `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` redo, `Cmd/Ctrl+Y` redo, `Delete`/`Backspace` delete selected nodes
- All zoom actions use `{ duration: 150 }` for smooth animation
- `useReactFlow()` and Liveblocks `useUndo()`/`useRedo()` called inside `<ReactFlow>` children via `ReactFlowControls` component

---

## API Conventions

- Return consistent shapes: `{ projects }`, `{ project }`, `{ error }` with appropriate HTTP status codes
- Route params in Next.js 16 are `Promise<{ param: string }>` — must be awaited
- Auth and ownership enforced at every mutation boundary
- Keep route handlers thin — push complexity into shared modules or background tasks

---

## Data & Storage

- Project metadata and relationships in PostgreSQL via Prisma
- Canvas content and large generated output stored separately (previously Vercel Blob, now Prisma `canvasJson`)
- `TaskRun` model tracks Trigger.dev runs with ownership (`userId`, `projectId`)
- `ChatMessage` model for cross-device chat persistence
- `canvasJson Json?` field on Project model stores canvas state as JSON directly

---

## Landing Page

- xAI-inspired design language: single dark canvas, white outline pills, mono uppercase eyebrows
- Weight-400 display type with negative tracking, no shadows (hairline borders only)
- Auth handled inline via modal overlay — no separate sign-in/sign-up routes
- `@paper-design/shaders-react` Dithering component for hero background (white-on-black, 20% opacity)
- Nanum Pen Script font with auto-playing PointerHighlight animation for "together"
- BorderGlow feature cards with directional glow on hover (cyan, purple, green themes)
- RadialGlowButton with animated radial gradient for CTA
- ProgressiveBlur from @magicui for scroll transition at viewport bottom

---

## Bug Fix Patterns

- React Flow edge error: handle IDs changed from `left-target` to `left` — same ID for both source and target on each side
- AI cursor smooth animation: CSS opacity transitions (fade-in 300ms, fade-out 500ms) + slower position interpolation (600ms cubic-bezier)
- Invalid logo error guard: React error boundary (`IconBoundary`) wraps `StackIcon` — renders first letter as fallback
- Chat formatting: full markdown rendering (headings, lists, code blocks, bold/italic, tech keyword highlighting)
- Canvas context read: switched from Liveblocks CRDT storage to Prisma `canvasJson` — CRDT wraps nodes in `InternalLiveblocksNode` objects
- Stale closure in save: `save()` reads from refs instead of closure variables
- `getProjects()` must resolve Clerk userId to email via `clerkClient().users.getUser()` — `ProjectCollaborator` stores email, not Clerk IDs
- Access denied page uses styled Link (not Button `asChild`) — shadcn Button is base-ui based, no `asChild` prop

---

## Scope Limits (Validation Engine)

- No cost estimation — rules are structural only, no pricing APIs
- No infrastructure-as-code generation
- No LLM calls for validation — pure graph traversal logic
- No external API calls — everything runs in the browser
- No persistent storage of validation results — transient state only
- No partial validation — if any node is unclassified, refuse to validate
- No shape/color-based detection — only label text and logo

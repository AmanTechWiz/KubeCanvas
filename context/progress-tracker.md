# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Phase Plan

- **Phase 1: Foundation** (features 1–7) — Design system, editor chrome, Clerk auth, landing page, header, project dialogs, Prisma setup ✅
- **Phase 2: Core Product** (features 8–12ish) — Canvas integration, real-time collaboration, API routes, AI generation, artifact storage
- **Phase 3: Polish & Ship** — Performance, error handling, deployment, edge cases

## Current Phase

- Phase 2: Core Product

## Completed

- feature [1] — Design system setup: shadcn/ui installation, dark theme CSS variables, component library
- feature [2] — Editor chrome: navbar, project sidebar, editor layout wrapper
- feature [3] — Clerk auth: provider, proxy, sign-in/sign-up pages, route protection, user menu
- feature [4] — Landing page: xAI-inspired hero with dithering background, animated pointer highlight, radial glow CTA, border glow feature cards, inline Clerk auth modal with grainy blur overlay; no separate sign-in/sign-up routes
- feature [5] — Header redesign: Framer Motion spring-animated header that morphs from full-width to floating pill on scroll, centered layout with left/right 50% + translateX, blur aesthetic with backdrop-filter, Features neon button, v0.1 green status pill, logo smooth-scroll to top
 - feature [5.1] — Header Apple-style liquid glass: added `components/ui/header-1.tsx` and demo `components/ui/header-1.demo.tsx` (glassmorphism variant, backdrop-blur, subtle white translucency)
- feature [5.2] — Editor navbar floating glass: workspace and editor-home navbars now float absolutely over canvas as rounded pill (`absolute top-2 inset-x-2 rounded-2xl`) with `backdrop-blur-xl`, `bg-white/[0.04]`, `border-white/[0.08]`, and drop shadow; sidebar switched to glassy `bg-black/60 backdrop-blur-xl`; body areas offset with `pt-14` to clear the floating navbar
- feature [6] — Project dialogs: editor home with create CTA, create/rename/delete project dialogs, sidebar project items with dropdown actions, mock data, useProjectDialogs hook
- feature [7] — Prisma setup: Project + ProjectCollaborator models, Prisma client singleton with Accelerate/direct branching, initial migration
- feature [8] — API routes: GET/POST `/api/projects`, PATCH/DELETE `/api/projects/[projectId]`, Clerk auth enforcement, ownership checks (401/403), build passes
- feature [9] — Editor wiring: server-side project fetching, real API mutations, useProjectActions hook, sidebar/dialogs wired to live data, create navigates to workspace, build passes
- feature [10] — Editor workspace shell: `/editor/[roomId]` server page with Clerk auth checks, project access helper (`lib/project-access.ts`), AccessDenied component, workspace layout with project-name navbar, share/AI sidebar toggles, ProjectSidebar with active-room highlighting, canvas placeholder, AI sidebar placeholder
- feature [11] — Share dialog: `ShareDialog` component with invite/remove collaborators (owner-only), Clerk-enriched collaborator list with avatars, copy-link with feedback; API route `GET/POST/DELETE /api/projects/[projectId]/collaborators` with ownership enforcement; wired to workspace navbar Share button; `projectSlug` prop added to WorkspaceShell; access revocation polling (`/api/projects/[projectId]/access`) with 5s interval + tab focus + dialog open/close triggers, reloads to AccessDenied on revocation; owner info shown in collaborator list for non-owner collaborators; fixed shared projects bug: `getProjects()` was querying by Clerk userId instead of email — collaborators now correctly see shared projects in sidebar
- feature [11.1] — Liveblocks setup: `liveblocks.config.ts` with Presence (cursor, isThinking) and UserMeta (name, avatar, color); cached Node client in `lib/liveblocks.ts` with deterministic `getUserColor()` palette helper; `POST /api/liveblocks-auth` route with Clerk auth + project access verification + room auto-creation + ID token issuance with user metadata; build passes
- feature [12] — Canvas integration: `types/canvas.ts` with `CanvasNodeData` (label, color, shape), `CanvasNode`, `CanvasEdge` types; `liveblocks.config.ts` Storage typed with `LiveblocksFlow<CanvasNode, CanvasEdge>`; `canvas-editor.tsx` client wrapper with `LiveblocksProvider` (auth endpoint), `RoomProvider` (room ID, initial presence), `ClientSideSuspense`, error boundary; React Flow wired via `useLiveblocksFlow({ suspense: true })` with synced nodes/edges/change handlers; loose connection mode, fitView, MiniMap, dot-pattern background; workspace-shell placeholder replaced; build passes
- feature [12.1] — Shape panel v1: bottom-center floating pill toolbar with 6 draggable shape icons (rectangle, diamond, circle, pill, cylinder, hexagon); `types/canvas.ts` updated with `NodeShape` union, `NODE_COLORS` palette (8 color pairs), `DEFAULT_NODE_COLOR`; `lib/canvas-shapes.ts` with shape definitions, drag payload serialization; `components/editor/canvas-node.tsx` custom node renderer with inline SVGs for each shape (bordered fill + centered label); `components/editor/shape-panel.tsx` ShapePanel component with glassmorphism styling; `canvas-editor.tsx` updated with custom `nodeTypes`, `useMutation` for Liveblocks Storage node creation, standalone DOM-based `screenToFlowPosition()`, wrapper div with native dragover/drop handlers; ShapePanel styled with `pointer-events-none` container + `pointer-events-auto` buttons; build passes
- feature [12.2] — Drag-and-drop fixes (multiple root causes): removed broken `pendingDropRef` + `useEffect` pattern (effect only ran once on mount due to `addNodeMutation` empty deps); calls `addNodeMutation` directly from React `onDrop` handler; added native DOM `dragover`/`drop` listeners on `.react-flow` element as fallback for browsers where React synthetic events don't fire reliably; native listener stores payload in `nativePendingDrop` state which triggers mutation via `useEffect`; fixed `screenToFlowPosition()` to read both inline `style.transform` and computed `matrix()` transform for robust viewport conversion; added `pointer-events-none` on ShapePanel container + `pointer-events-auto` on buttons to prevent panel from intercepting canvas drops; added `width`/`height` fields to newly created `LiveObject` nodes so React Flow can size them correctly
- feature [12.3] — Node renderer simplified per spec: replaced shape-specific SVG renderers (`RectangleShape`, `DiamondShape`, `CircleShape`, `PillShape`, `CylinderShape`, `HexagonShape`) with a single bordered-rectangle renderer; all nodes render as rounded rectangles with centered label; removed `"Untitled"` fallback text — labels are shown as stored (empty by default per spec); added `DEFAULT_NODE_COLOR` import for fallback color
- feature [12.4] — Cleanup mutation + Clear All button: one-shot `cleanupMutation` runs on mount to (a) remove nodes with broken `position` data from Liveblocks Storage, (b) populate missing `width`/`height` for legacy nodes using `SHAPES` definitions, (c) populate missing `label` and `color` fields; `addNodeMutation` writes a visible default color (`#6457f9`) so nodes are visible against dark canvas; floating "Clear All" button (`z-[61]`, glassmorphism style) invokes `clearNodesMutation` which deletes all entries from the `flow.nodes` LiveMap; button positioned below workspace navbar (`top-16 right-4`); build passes
- feature [13] — Shape rendering v2: replaced placeholder bordered-rectangle node renderer with per-shape rendering; CSS shapes (rectangle, pill, circle) use `border-radius` with solid fill; SVG shapes (diamond, hexagon, cylinder) render with `<svg>` viewBox that scales with node dimensions, `vectorEffect="non-scaling-stroke"` for consistent borders; borders subtle at rest (`border-white/[0.12]`) and brighter when selected (`border-white/[0.35]`); added `ShapeDragPreview` component that renders a semi-transparent ghost of the dragged shape at the cursor position during HTML5 drag from shape panel; ghost uses `position: fixed` at `z-[9999]`, tracks cursor via `document`-level `dragover`, auto-hides on `dragend`/`drop`; ghost renders the same shape variant and default size as the node that will be created on drop; drag payload captured on `dragstart` into a ref (because `getData()` is restricted to `drop` event only in browsers); shape panel buttons use transparent drag image to suppress browser default ghost; `ShapeDragPreview` rendered in workspace shell canvas area; build passes
- feature [13.1] — Connection handle accessibility: replaced directional-only handles (target-only on Top/Left, source-only on Bottom/Right) with bidirectional handles — every side (Top, Bottom, Left, Right) now has both a source and target handle so connections can be freely dragged from any side to any side; handles are direct children of the node div (no `<span>` wrappers) so ReactFlow positions them correctly at the node border; visible dot is 12px (`!w-3 !h-3`) with `bg-white/80` and `border-white/30`, hidden by default and revealed on `group-hover/node:opacity-100`; individual handle hover scales to 150% with white glow (`hover:!shadow-[0_0_8px_rgba(255,255,255,0.5)]`) for clear targeting feedback; `connectionRadius={40}` on ReactFlow so nearest handle snaps within 40px; `snapToGrid` + `snapGrid={[10, 10]}` for clean edge alignment; build passes
- feature [14] — Resize handles + inline label editing: added React Flow built-in `NodeResizer` to `canvas-node.tsx` with 8 corner/edge handles visible only when `selected`; handles styled as subtle 10px white/60% dots that brighten on hover; minimum node dimensions enforced (60×40px); `autoScale={false}` keeps handles consistent size regardless of zoom; resize flows through `onNodesChange` → Liveblocks Storage sync; added inline label editing — double-click node label area to enter edit mode, textarea overlay positioned absolutely over label; `useReactFlow().updateNode()` writes label changes to Liveblocks Storage; editing closes on blur (commits) or Escape (reverts); Enter commits the label; placeholder text "Label" shown in same centered position when empty; textarea `onPointerDown`/`onKeyDown` stop propagation to prevent canvas drag/pan during editing; node component now receives `id` from `NodeProps` for resize and label updates; build passes
- feature [15] — Floating color toolbar: added `ColorToolbar` component (`components/editor/color-toolbar.tsx`) that renders one swatch per `NODE_COLORS` pair above selected nodes; swatches show the node background as fill with a small inner dot showing the paired text color; active swatch has a colored border matching its text color; hover triggers a tight glow (`box-shadow 8px 1px`) using the text color; toolbar positioned `absolute -top-11 left-1/2 -translate-x-1/2 z-50` inside the node div so it floats above without overlapping; all pointer/click/wheel events stopped from propagating to prevent canvas drag/pan; `CanvasNodeData` extended with `textColor` field; `textColorForBg()` helper added to `types/canvas.ts` for reverse lookup; `canvas-node.tsx` updated to use `textColor` from data (with `textColorForBg` fallback) for label text via inline `style.color`; color selection calls `updateNode(id, ...)` to update both `color` and `textColor` through Liveblocks Storage; cleanup mutation extended to populate missing `textColor` fields from `NODE_COLORS` lookup; `addNodeMutation` writes `textColor` for new nodes; build passes
- feature [16] — Custom edge renderer + inline label editing: created `components/editor/canvas-edge.tsx` with custom right-angle edge using `getSmoothStepPath` (borderRadius: 8); edges always use right-angle (smooth-step) routing for clean bends; edges dimmed at rest (`rgba(255,255,255,0.25)`) and brightened on hover/selection (`rgba(255,255,255,0.7)`) with 150ms transition; wide invisible hit-area via `interactionWidth={20}` on `BaseEdge` for easy hovering/clicking without increasing visible line thickness; arrowhead rendered by React Flow's `MarkerType.ArrowClosed` on `BaseEdge` `markerEnd` — arrow always appears at the target node end of the path; arrow color matches edge stroke and brightens on hover/selection; inline label editing: double-click opens an `<input>` positioned via `EdgeLabelRenderer` with midpoint coordinates from `getSmoothStepPath`; input grows with text (char width × 7 + 20px), saves on blur/Enter, reverts on Escape; saved labels render as small pill badges (`bg-black/60 backdrop-blur-sm border-white/[0.12]`); faint "Add label" hint shown on active unlabeled edges; all label interactions use `nodrag nopan` classes + event `stopPropagation` to prevent canvas drag/pan; labels update through Liveblocks collaborative data flow via `useReactFlow().updateEdge()`; `edgeTypes` and `defaultEdgeOptions` (including `markerEnd` with `MarkerType.ArrowClosed`) registered on `<ReactFlow>` in `canvas-editor.tsx`; build passes
- feature [17] — Canvas controls + keyboard shortcuts: created `components/editor/canvas-controls.tsx` floating pill bar at bottom-center (`absolute bottom-20 left-1/2 -translate-x-1/2 z-[61]`) with glassmorphism styling (`bg-black/60 backdrop-blur-xl border-white/[0.08]`); two groups separated by a thin white/12% divider — zoom controls (zoom out, fit view, zoom in) and history controls (undo, redo); all buttons use inline SVG icons in 14px, 7×7 rounded-md hit areas, white/60% resting state, brighten on hover; disabled buttons (undo/redo when nothing to undo/redo) are opacity-25% with `cursor-not-allowed`; zoom in/out call `reactFlowInstance.zoomIn/zoomOut({ duration: 150 })` for smooth animation; fit view calls `reactFlowInstance.fitView({ duration: 200, padding: 0.2 })`; undo/redo call Liveblocks `useUndo()`/`useRedo()` hooks; `useCanUndo()`/`useCanRedo()` control button disabled state; created `hooks/useKeyboardShortcuts.ts` hook that receives `ReactFlowInstance`, `undo`, and `redo` handlers; listens on `window` keydown; ignores shortcuts when focus is on INPUT, TEXTAREA, SELECT, contentEditable, or elements with textbox/searchbox/combobox roles; shortcuts: `+`/`=` zoom in, `-` zoom out, `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` redo, `Cmd/Ctrl+Y` redo; removed MiniMap from canvas; build passes
- feature [18] — Starter templates: created `components/editor/starter-templates.ts` with `CanvasTemplate` type and 3 pre-built templates (Microservices: API Gateway + 3 services + 3 databases; CI/CD Pipeline: Code → Build → Test/Security → Staging → Production; Event-Driven: 3 producers → Event Bus → 3 consumers); each template uses shared `NodeShape` types and `NODE_COLORS` palette; created `components/editor/starter-templates-modal.tsx` with glassmorphism dialog (`!max-w-[calc(100%-2rem)] sm:!max-w-4xl` overriding base `sm:max-w-sm`) showing scrollable 3-column grid of template cards; each card has lightweight SVG preview (auto-scaled bounding box, handle-based edge routing, nodes rendered with correct shape and color), name, description, and "Use Template" button; SVG preview supports all 6 shapes (rectangle, diamond, circle, hexagon, pill, cylinder); all template edges use explicit `sourceHandle`/`targetHandle` values (e.g. `bottom-source`→`top-target` for vertical flows, `right-source`→`left-target` for horizontal flows) to ensure clean directional connections; `TemplateImporter` creates LiveObject edges with `sourceHandle`/`targetHandle` fields so React Flow routes edges through the correct handles; wired into editor: added `LayoutTemplate` icon Templates button in workspace navbar; `StarterTemplatesModal` manages open state; on template selection, sets `pendingTemplate` state which flows through WorkspaceShell → CanvasEditor → FlowCanvas → `TemplateImporter` component; `TemplateImporter` lives inside `<ReactFlow>` (needs `useReactFlow` for `fitView`); `importMutation` atomically clears all nodes AND edges from Liveblocks Storage, then adds template nodes as `LiveObject`s with nested `data` LiveObject, and template edges as `LiveObject`s with handle fields (type/markerEnd/style handled by `defaultEdgeOptions`); `fitView({ duration: 300, padding: 0.2 })` called via 150ms setTimeout after mutation for CRDT propagation; build passes
- feature [19] — Cursor sync + collaborator presence: created `components/editor/collaborator-avatars.tsx` showing overlapping avatar stack in top-right of editor canvas (max 5 visible + "+N" overflow chip, subtle ring, initials fallback); uses `useOthers()` from Liveblocks to list room participants, filters out current user (resolved via `useSelf()`), shows divider only when collaborators exist, renders Clerk `UserButton` for current user; created `components/editor/live-cursors.tsx` rendering live cursor pointers for other participants; each cursor is an SVG arrow with a name badge, colored to match the participant's Liveblocks presence color; badge text color computed dynamically via sRGB relative luminance (`contrastingTextColor()`) — dark text (#111) on light colors, white (#fff) on dark colors; cursor positions stored as flow coordinates in Liveblocks presence, broadcast via document-level `mousemove` + `pointermove` listeners (throttled 50ms) through `useUpdateMyPresence()` — both events needed because React Flow uses `setPointerCapture()` during node drag which suppresses `mousemove` but not `pointermove`; viewport tracked via `onMove` callback and used to convert flow coordinates → screen coordinates for rendering; `CanvasEditor` updated to accept and pass `currentUserId` prop through to `FlowCanvas`; `WorkspaceShell` passes `currentUserId` to `CanvasEditor`; `CollaboratorAvatars` rendered outside ReactFlow (top-right, `z-[61]`), `LiveCursors` rendered inside ReactFlow (`z-[62]`); existing navbar unchanged; `liveblocks.config.ts` Presence type already includes `cursor` and `isThinking` — no changes needed; build passes
- feature [20] — AI sidebar v1: separated AI sidebar into `components/editor/ai-sidebar.tsx` with `AiSidebar` component (open/close controlled by parent); floating fixed-position right panel (`fixed right-2 top-[56px] bottom-2 z-50`) with glassy UI (`bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-150` + inset shadow); header with bot icon, "KubeAI" title (font-semibold), "stuck somewhere? Try me!" subtitle, close button with glassy background; pill-shaped centered tabs (`rounded-full` with `data-active` highlight); AI Architect tab: scrollable chat area with empty state (bot icon, description, 3 starter prompt chips), user messages right-aligned with accent-dim background, assistant messages left-aligned, auto-resizing textarea (72–160px) with Enter-to-send / Shift+Enter newline; Specs tab: "Generate Spec" accent button, demo spec card; workspace-shell.tsx updated: AI toggle button at `absolute bottom-4 right-4 z-[60]` (only visible when sidebar closed), sidebar state managed in WorkspaceShell; collaborator avatars hidden with `pointer-events-none opacity-0` when AI sidebar is open to avoid z-index conflicts; all color tokens from `globals.css` (no hardcoded hex); build passes
- feature [21] — Clear All relocated to shape panel: removed floating Clear All button from top-right of canvas; added `onClear` callback to `ShapePanelContext` (wired from `clearNodesMutation` in `canvas-editor.tsx`); created `ClearConfirmButton` component in `components/editor/clear-confirm.tsx` — circle trash icon button with centered glassy confirmation dialog rendered via `createPortal` to `document.body`; dialog uses `fixed inset-0` overlay with `bg-black/40 backdrop-blur-xs` backdrop and centered card (`bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-150` + deep shadow) matching AI sidebar glassy styling; confirmation text ("Clear entire canvas? This will remove all shapes and cannot be undone.") with Cancel and Clear All (red) buttons; Escape key and backdrop click dismiss the dialog; `ShapePanel` component updated to read `onClear` from context and render `ClearConfirmButton` after a divider; `ShapePanel` moved from `workspace-shell.tsx` into `canvas-editor.tsx` inside the `FlowCanvas` provider (needed for `ShapePanelContext` availability); `ShapePanel` import added to `canvas-editor.tsx`, removed from `workspace-shell.tsx`; build passes

## Current Goal

- feature [21] — Completed ✅

## Next Up

- Next feature TBD

## Open Questions

- None yet.

## Rules

- Update "Current Phase" whenever all features in a phase are completed — do not leave it stale.

## Architecture Decisions

- Tailwind v4 with `@import "tailwindcss"` syntax (not v3 directives)
- shadcn/ui components in `components/ui/` are protected foundation components — do not modify after installation
- Dark-only theme: `:root` contains dark values directly, no `.dark` class toggling needed
- Brand colors mapped to shadcn/ui CSS variables: `--primary` = cyan (#00c8d4), `--accent` = indigo-purple (#6457f9)
- Editor chrome components live in `components/editor/`
- Sidebar uses floating overlay pattern — slides over canvas, does not push content
- Editor route at `/editor` with its own layout; main site `/` is standalone
- Clerk auth via `proxy.ts` (not middleware.ts) — public routes defined by sign-in/sign-up env vars
- Clerk dark theme appearance with CSS variable overrides for seamless integration
- Auth pages use inline `style` props with CSS variables instead of Tailwind color utilities (Tailwind v4 semantic classes like `bg-background`, `text-foreground` do not resolve visually)
- Do NOT import from `@clerk/ui` in application code — it triggers Clerk's bundled UI portal mode which covers the custom layout
- Landing page follows xAI design language: single dark canvas, white outline pills, mono uppercase eyebrows, weight-400 display type with negative tracking, no shadows (hairline borders only)
- Auth is handled inline on the landing page via modal overlay — no separate sign-in/sign-up routes
- Clerk components use `routing="hash"` for in-modal authentication without page navigation
- Liveblocks uses access token authentication (`prepareSession` + `session.allow` + `session.authorize`) — NOT `identifyUser()` which requires the external Permissions API
- Liveblocks room ID = project ID (cuid) — private rooms with `defaultAccesses: []`
- Cursor colors are deterministically derived from user ID using a fixed 16-color palette hash
- Liveblocks Node client is cached as a singleton in `lib/liveblocks.ts` (same pattern as Prisma)
- Auth route `/api/liveblocks-auth` verifies Clerk auth + project access, creates/reuses room, then issues an access token via `prepareSession` + `session.allow(roomId, ["*:write"])` + `session.authorize()`
- Canvas uses `useLiveblocksFlow({ suspense: true })` from `@liveblocks/react-flow` to sync React Flow state via Liveblocks Storage
- `LiveblocksFlow<CanvasNode, CanvasEdge>` is the Storage type for the React Flow diagram (key: `"flow"`)
- Canvas wrapper (`canvas-editor.tsx`) owns the full Liveblocks room lifecycle — providers are not hoisted to layout
- Error boundary wraps the entire Liveblocks provider tree to catch connection/auth failures gracefully
- Loose connection mode (`ConnectionMode.Loose`) allows connecting any node to any node
- Bidirectional connection handles — every side (Top, Bottom, Left, Right) has both source and target handles so users can drag connections freely in any direction; handles must be direct children of the node div (no wrapper elements) for ReactFlow positioning; `connectionRadius={40}` for generous snap zone; `snapToGrid` + `snapGrid={[10, 10]}` for clean alignment
- Shape panel is a floating pill toolbar at bottom-center of canvas, styled with glassmorphism (`bg-black/60 backdrop-blur-xl`, `border-white/[0.08]`, inset shadow)
- Shape drag uses HTML5 native drag-and-drop (`dataTransfer` with `application/x-kubecanvas-shape` MIME type)
- Shape definitions live in `lib/canvas-shapes.ts` — includes shape name, default width/height, and drag payload serialization helpers
- Custom canvas nodes registered via `nodeTypes` on React Flow — `CanvasNodeComponentMemo` renders shape-specific variants: CSS shapes (rectangle, pill, circle) with border-radius; SVG shapes (diamond, hexagon, cylinder) with viewBox scaling; borders brighten on selection via `selected` prop from NodeProps
- Node creation uses Liveblocks `useMutation` to write directly to Storage — nodes added via `flow.get("nodes").set(id, new LiveObject(...))` with `width`, `height`, visible default `color`, and empty `label`
- Screen-to-flow coordinate conversion reads the viewport transform from the `.react-flow__viewport` DOM element (inline `style.transform` or computed `matrix()` fallback), not from `flow.get("viewport")` inside the mutation
- Node IDs generated from shape name + timestamp + counter (`{shape}-{ts}-{n}`)
- ShapePanelContext provides `addNode` callback from FlowCanvas — wrapper div handles `dragover`/`drop` via both React synthetic handlers and native DOM listeners
- `ShapePanel` rendered in workspace-shell inside the canvas area div with `relative` positioning — positioned `absolute bottom-4 left-1/2 -translate-x-1/2 z-50`
- Node color palette (8 color pairs with dark bg + vivid text) defined in `types/canvas.ts` as `NODE_COLORS`; default node color is neutral dark (`#1F1F1F` bg, `#EDEDED` text); visible default for new nodes is indigo (`#6457f9`)
- One-shot `cleanupMutation` runs on mount to fix broken nodes in Storage (missing position, width, height, label, color); `clearNodesMutation` removes all nodes from `flow.nodes` LiveMap
- Floating "Clear All" button in canvas top-right (`z-[61]`) styled with glassmorphism; positioned below the workspace navbar (`top-16`)
- `ShapeDragPreview` renders a semi-transparent ghost overlay during shape drag from panel; uses `position: fixed` at `z-[9999]`, tracks cursor via `document`-level `dragover` event; auto-hides on `dragend`/`drop`; renders the same shape variant and default size as the drop target; rendered in workspace shell canvas area
- Connection handles are bidirectional — each side (Top, Bottom, Left, Right) has both `source` and `target` handles so users can drag connections freely in any direction; handles are 12px visible dots with 24px hit areas via Tailwind `!w-3 !h-3` classes; handles must be direct children of the node div (no wrapper elements) for ReactFlow to position them correctly
- `connectionRadius={40}` on ReactFlow — snaps to nearest handle within 40px so precision clicking isn't required
- Collaborator avatars are positioned at `top-16 right-4 z-[61]` in the editor canvas area (not in the navbar); max 5 visible avatars with "+N" overflow; uses Liveblocks `useOthers()` to list participants and `useSelf()` to identify current user; Clerk `UserButton` renders the current user separately; divider only shown when collaborators exist
- Live cursors are rendered inside `<ReactFlow>` at `z-[62]` (above collaborator avatars at `z-[61]`); cursor positions stored as flow coordinates in Liveblocks presence, broadcast via document-level `mousemove` + `pointermove` listeners (throttled 50ms) through `useUpdateMyPresence()` — both events needed because React Flow uses `setPointerCapture()` during node drag which suppresses `mousemove` but not `pointermove`; viewport tracked via `onMove` callback to convert flow coordinates → screen coordinates for rendering; SVG arrow pointer with name badge, colored to match participant's Liveblocks presence color; badge text color computed dynamically via sRGB relative luminance (`contrastingTextColor()`) — dark text on light colors, white on dark colors
- `snapToGrid` + `snapGrid={[10, 10]}` for aligned edge routing
- Shape drag payload is captured during `dragstart` (document-level) into a ref because `dataTransfer.getData()` only works during `drop`, not `dragover` — the cached ref is read on first `dragover` to initialize the preview
- Custom canvas edges always use `getSmoothStepPath` for right-angle routing (borderRadius: 8) — no straight-line shortcuts; `EdgeLabelRenderer` positions labels at the path midpoint coordinates (`labelX`, `labelY`) returned by `getSmoothStepPath` — no manual midpoint calculation
- Edge hit-area is React Flow's built-in `interactionWidth={20}` on `BaseEdge` — makes edges easy to hover/click without thickening the visible line; no separate transparent path needed
- Edge arrow is rendered by React Flow's `MarkerType.ArrowClosed` via `markerEnd` on `BaseEdge` — arrow always appears at the target node end of the path
- Edge labels flow through Liveblocks collaborative data via `useReactFlow().updateEdge()` writing to edge `data.label`
- Label interactions use `nodrag nopan` classes + `stopPropagation` on pointer/keyboard events to prevent canvas drag/pan
- `defaultEdgeOptions` on ReactFlow sets custom `canvasEdge` type + `MarkerType.ArrowClosed` (white/45%, 20×20) marker for all new connections
- Package manager switched from pnpm to bun — `bun install`, `bun run dev`, `bun run build`; removed `"packageManager"` field from `package.json` and deleted `pnpm-lock.yaml`
- Liveblocks provides `useUndo()`/`useRedo()` hooks for collaborative history, and `useCanUndo()`/`useCanRedo()` for disabled state — these work on all Liveblocks Storage mutations
- `useReactFlow()` from `@xyflow/react` returns the `ReactFlowInstance` for programmatic zoom/fitView — must be called inside `<ReactFlow>` children (inside the Room provider tree); canvas controls + keyboard shortcuts extracted into a `ReactFlowControls` component rendered as a child of `<ReactFlow>` to satisfy this constraint
- Keyboard shortcuts use `window`-level `keydown` listener with editable-field guard — checks `isContentEditable`, INPUT/TEXTAREA/SELECT tags, and textbox/searchbox/combobox ARIA roles to skip shortcuts while typing
- Canvas controls bar positioned at `bottom-20` (above shape panel at `bottom-4`) with `z-[61]` to sit above the ReactFlow canvas
- All zoom actions use `{ duration: 150 }` for smooth animation feel
- Shape panel buttons use a 1×1px transparent drag image (`setDragImage`) to suppress the browser's default ghost icon — our custom `ShapeDragPreview` renders the full-size shape ghost instead
- Native DOM listeners attached to `.react-flow` element for `dragover`/`drop` as fallback — queues mutations via `nativePendingDrop` React state to stay within hooks context
- Landing page hero uses `@paper-design/shaders-react` Dithering component (white-on-black, 20% opacity) inside a rounded card
- "together" uses Nanum Pen Script font with auto-playing PointerHighlight animation (cycles corners every 7.5s)
- Feature cards wrapped in BorderGlow component with directional glow on hover (cyan, purple, green themes)
- "Get started" button uses RadialGlowButton with animated radial gradient
- ProgressiveBlur from @magicui used at viewport bottom for scroll transition effect; hides near page bottom so footer renders clear
- Logo from `/public/logo_design.png` used in navbar branding
- "Explore more" fixed at viewport bottom, smooth-scrolls to features, hides when scrolled past top
- Header uses Framer Motion (`motion` package) for spring-animated morph between full-width and floating pill states
- Header centered via `left-1/2` + `style={{ x: '-50%' }}` instead of `mx-auto`
- Logo stays constant size (h-10 md:h-26) — does not shrink on scroll
- Header always has `backdrop-filter: blur(20px)` for frosted glass aesthetic in both states
- NeonButton component for Features link with white neon gradient lines on hover
- v0.1 status pill with green neon vibe (green-500 text/bg/border, pulsing dot, mono font)
- `hooks/` directory for shared React hooks
- useProjectDialogs hook centralizes dialog, form, and mock data state for editor- Route params in Next.js 16 are `Promise<{ param: string }>` — must be awaited in handler
- API routes return consistent shapes: `{ projects }`, `{ project }`, `{ error }` with appropriate HTTP status codes
- Editor page is a server component; interactive parts use small client components (`NewProjectButton`, `EditorLayoutClient`)
- `useProjectActions` hook replaces mock `useProjectDialogs` — accepts `{ pathname, refresh }` params for navigation and data refresh
- Project ID (cuid) serves as Liveblocks room ID — navigate to `/editor/{projectId}`
- `lib/project-types.ts` defines shared `ProjectData`/`SharedProjectData` interfaces used by server data helpers and client components
- Node resizing uses React Flow built-in `NodeResizer` component (8 corner/edge handles) — handles are absolutely positioned inside the node div and synced via `onNodesChange` → Liveblocks Storage; minimum dimensions enforced at 60×40px; handles styled with custom `handleClassName` (subtle white/60% dots, brighten on hover) and `lineClassName` (white/30% borders); `autoScale={false}` keeps handle sizes fixed
- Inline label editing: double-click triggers edit mode with `<textarea>` overlay positioned absolutely over the label area; `useReactFlow().updateNode()` writes label changes to Liveblocks Storage; textarea `onPointerDown`/`onKeyDown` stop propagation to prevent canvas drag/pan during editing; editing closes on blur (commit) or Escape (revert); Enter commits; placeholder "Label" shown when label is empty
- `useReactFlow()` hook from `@xyflow/react` available inside custom nodes for `updateNode()` — works with Liveblocks Flow sync layer without needing direct `useMutation` for data updates
- Floating color toolbar: `ColorToolbar` component rendered inside each custom node when `selected`; positioned `absolute -top-11 left-1/2 -translate-x-1/2 z-50`; swatches use `NODE_COLORS` pairs with bg fill + text color inner dot; all pointer/click/wheel events stopped from propagating to prevent canvas drag/pan; swatch selection calls `updateNode(id, ...)` to update both `color` and `textColor` through Liveblocks Storage
- `textColor` field added to `CanvasNodeData` — stores the paired text color for each node; `textColorForBg()` helper in `types/canvas.ts` for reverse lookup; cleanup mutation auto-populates missing `textColor` from `NODE_COLORS`
- `lib/project-access.ts` provides `getCurrentIdentity()` and `checkProjectAccess()` helpers for server-side auth and project access checks
- Access denied page uses styled Link (not Button `asChild`) — shadcn Button is base-ui based, no `asChild` prop
- ProjectSidebar accepts optional `currentProjectId` prop to highlight the active room
- Workspace shell is a client component (`workspace-shell.tsx`) with sidebar, AI sidebar toggle, share button, and canvas placeholder
- `/editor/[roomId]` page is a server component that checks auth → redirects unauthenticated, shows AccessDenied for unauthorized, renders WorkspaceShell for authorized users
- Project slug or ID can be used as the `roomId` param — `checkProjectAccess` tries both
- `EditorLayoutClient` detects workspace pages via `pathname.startsWith` check and passes children through without chrome — prevents duplicate navbar/sidebar
- Rename flow navigates to new slug when renaming the currently-open workspace project
- Auth modal uses click event interception (capture phase) on Clerk container to prevent Clerk's internal path-based navigation from breaking the in-modal hash-based flow
- Clerk `<SignIn>`/`<SignUp>` use `routing="hash"` + `forceRedirectUrl="/editor"` for in-modal auth without page navigation
- Access revocation uses polling (5s interval) + event-driven checks (tab focus, dialog open/close) + `window.location.reload()` to trigger server re-check and render AccessDenied
- Share dialog GET endpoint returns both `collaborators` array and `owner` object (name, email, avatarUrl) enriched via Clerk
- `useRef` for mutable access-check function reference avoids re-render cycles while allowing cross-scope access
- `getProjects()` must resolve Clerk userId to email via `clerkClient().users.getUser()` before querying shared projects — `ProjectCollaborator` stores email, not Clerk IDs
- `useProjectActions` hook exposes `error` state — all three mutation catch blocks set it with `e instanceof Error ? e.message : "Something went wrong"`, cleared on dialog open/close
- DeleteProjectDialog accepts `error: string | null` prop, renders error message below description; `onOpenChange` guard blocks dismiss while loading
- ProgressiveBlur component does not accept `children` — it renders a styled overlay, not a wrapper
## Session Notes

- Project uses Next.js 16, React 19, Tailwind v4
- Dark-only theme with CSS custom properties defined in ui-context.md
- Favicon lives in `app/favicon.ico` (App Router convention)
- Installed components: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea, DropdownMenu
- `lib/utils.ts` provides `cn()` helper using clsx + tailwind-merge
- shadcn Tabs uses @base-ui/react/tabs — TabsPrimitive.Root, TabsPrimitive.List, TabsPrimitive.Tab, TabsPrimitive.Panel
- shadcn Dialog already includes DialogHeader, DialogTitle, DialogDescription, DialogFooter
- EditorNavbar: fixed h-12, left sidebar toggle, right empty, bg-surface with border-b
- ProjectSidebar: floating overlay, w-72, slides from left, Tabs with My Projects/Shared, New Project button
- EditorLayout wraps navbar + sidebar + children, manages sidebar state + dialog state via useProjectDialogs
- Root layout is clean shell; `/editor` layout applies EditorLayout
- Clerk auth wired: ClerkProvider in root layout with CSS variable overrides (no `@clerk/ui` theme import)
- proxy.ts at root uses clerkMiddleware with createRouteMatcher for public auth routes
- Sign-in/sign-up pages: two-panel grid layout (left branding, right Clerk form), hidden on small screens via `hidden lg:flex` — DEPRECATED: now redirect to `/`
- Root page (/) redirects authenticated users to /editor, unauthenticated see landing page with inline auth modal
- UserButton added to editor navbar right section
- Landing page is a client component (`components/landing/landing-page.tsx`) with auth modal state
- "Get started" button in navbar and hero opens Clerk SignIn/SignUp modal inline on the landing page
- Auth modal: dark overlay (`rgba(0,0,0,0.75)` + `blur(12px)`) with SVG fractalNoise grain texture, Clerk components use `routing="hash"` for in-modal auth flow
- Old `/sign-in` and `/sign-up` pages now redirect to `/` — all auth happens via the landing page modal
- Clerk SignIn/SignUp components rendered inside modal with same CSS variable appearance overrides as root ClerkProvider
- Added UI context CSS vars (--bg-base, --bg-surface, --bg-elevated, --text-primary, --text-secondary, --accent-primary, --state-*, etc.) to globals.css for Clerk appearance overrides
- Added NEXT_PUBLIC_CLERK_SIGN_IN_URL and NEXT_PUBLIC_CLERK_SIGN_UP_URL env vars
- Installed: `motion` (framer-motion successor), `@paper-design/shaders-react` (Dithering), `@aceternity/pointer-highlight`, `@magicui/progressive-blur`
- Custom components: `BorderGlow` (components/ui/BorderGlow.tsx + .css), `RadialGlowButton` (components/ui/radial-glow-button.tsx), `HeroDithering` (components/ui/hero-dithering-card.tsx)
- PointerHighlight extended with `autoPlay`, `interval`, `directions` props for self-cycling animation
- Nanum Pen Script font loaded via next/font/google for "together" display text

### Project Dialogs Notes (session 2026-06-17)

- Editor home shows heading, description, and "New Project" button centered in canvas area
- Three dialogs: Create, Rename, Delete — all use shadcn Dialog (base-ui)
- Create dialog: name input + live slug preview using `generateSlug()` helper
- Rename dialog: prefilled input, auto-focus, Enter key submits
- Delete dialog: destructive confirmation only, no input
- `useProjectDialogs` hook manages dialog/form/loading state and mock project CRUD
- Mock data in `lib/mock-projects.ts` — 3 sample projects (2 owned, 1 shared)
- Sidebar project items show dropdown actions (rename/delete) only for owned projects
- Shared projects render without action menu
- DropdownMenu installed from shadcn (base-ui `@base-ui/react/menu`)
- Mobile backdrop scrim already existed — no changes needed
- EditorLayout wires hook to sidebar + dialogs; page receives `onCreateProject` callback
- No API calls or persistence — pure mock data

### Prisma Setup Notes (session 2026-06-17)

- Prisma schema at `prisma/schema.prisma` with `prisma.config.ts` pointing to `prisma/` directory
- Models: `Project` (ownerId, name, description, status enum DRAFT/ARCHIVED, canvasJsonPath, timestamps) and `ProjectCollaborator` (projectId, email, cascade delete, unique constraint)
- Generator output to `app/generated/prisma/` for Next.js compatibility
- `lib/prisma.ts`: cached singleton using `@prisma/adapter-pg` for direct connections, Accelerate branch for `prisma+postgres://` URLs
- `prisma.config.ts` loads `.env.local` via `dotenv` config for DATABASE_URL
- Migration: `prisma/migrations/20260617200317_init/`

### API Routes Notes (session 2026-06-18)

- `app/api/projects/route.ts`: GET lists user's projects (ordered by createdAt desc), POST creates project (defaults name to "Untitled Project")
- `app/api/projects/[projectId]/route.ts`: PATCH renames project, DELETE removes project
- Auth: `auth()` from `@clerk/nextjs/server` returns `{ userId }` — null means unauthenticated → 401
- Ownership: project queried by ID, `ownerId` compared to `userId` — mismatch → 403
- Next.js 16 route params are a `Promise<{ projectId: string }>` — must `await params`
- Route handlers use Web Request/Response APIs, return `NextResponse.json()`
- Build confirms both routes registered as dynamic (`ƒ`)

### Editor Wiring Notes (session 2026-06-18)

- Editor page (`app/editor/page.tsx`) converted from client to server component — fetches projects via `getProjects()` server-side
- `lib/project-data.ts`: server-only helper that fetches owned + shared projects using Prisma and Clerk auth
- `lib/project-types.ts`: shared `ProjectData` and `SharedProjectData` interfaces used across server and client
- `hooks/use-project-actions.ts`: replaces `useProjectDialogs` mock hook with real API calls (POST/PATCH/DELETE)
- `app/editor/editor-layout-client.tsx`: client wrapper that manages sidebar state, dialog state, and project mutations
- `app/editor/layout.tsx`: server component shell that fetches data and renders `EditorLayoutClient`
- `app/editor/new-project-button.tsx`: small client component for the interactive "New Project" button on the server-rendered home page
- Create: calls `POST /api/projects`, navigates to `/editor/{projectId}` (project ID used as room ID)
- Rename: calls `PATCH /api/projects/{id}`, refreshes via `router.refresh()`
- Delete: calls `DELETE /api/projects/{id}`, redirects to `/editor` if deleting active workspace, otherwise refreshes
- Sidebar now accepts `currentUserId` prop instead of importing `MOCK_USER_ID`
- `generateSlug()` exists in both `lib/mock-projects.ts` (for backward compat) and `lib/project-data.ts` (server) and `hooks/use-project-actions.ts` (client)
- No client-side fetching on initial load — all project data fetched server-side

### Header Redesign Notes (session 2026-06-17)

- Switched header from CSS `transition-all` to Framer Motion spring physics (`stiffness: 200, damping: 25, mass: 0.8`) for smooth morph animation
- `motion.header` animates: width, marginTop, borderRadius, backgroundColor, backdropFilter, boxShadow, borderWidth, borderColor
- Logo uses `motion.img` for smooth height transitions (now static at h-10/h-26)
- Header centered on screen using `left-1/2` + `style={{ x: '-50%' }}` — works for both full-width and compact states
- Unscrolled state: `rgba(9, 9, 11, 0.7)` background with `blur(20px)`, no border
- Scrolled state: `rgba(9, 9, 11, 0.8)` background with `blur(20px)`, `max-width: min(1024px, calc(100% - 32px))`, `borderRadius: 9999`, `marginTop: 16px`
- Created `NeonButton` component (`components/ui/neon-button.tsx`) with default/solid/ghost variants, `neonColor` prop for custom gradient
- Created `LiquidButton` component (`components/ui/liquid-glass-button.tsx`) with glass filter SVG effect (not currently used in header)
- Features button uses NeonButton with white neon gradient, white-tinted bg (`!bg-white/5`), white border (`!border-white/20`)
- v0.1 pill: green-500 text, green background glow, pulsing dot, mono font
- Logo click smooth-scrolls to top instead of page reload
- Hero section pushed up with `pt-8 pb-24` for better vertical centering

### Editor Workspace Shell Notes (session 2026-06-18)

- `/editor/[roomId]` is a server component that enforces auth + project access before rendering
- Unauthenticated users are redirected to `/sign-in` via `redirect()`
- Unauthorized or non-existent projects render `<AccessDenied />` (lock icon, message, link back to `/editor`)
- `lib/project-access.ts`: `getCurrentIdentity()` returns `{ userId, email }` or null; `checkProjectAccess(idOrSlug)` returns `{ userId, email, project, isOwner }` or null
- `checkProjectAccess` queries project by ID first, then by slug — supports both URL patterns
- WorkspaceShell is a client component managing local state: sidebar open, AI sidebar open
- Workspace navbar: left = sidebar toggle + divider + project name; right = Share button + AI sparkle toggle + UserButton
- Share button opens ShareDialog (owner can invite/remove; collaborator sees read-only list)
- AI sidebar: 320px wide panel slides in from the right, placeholder content for future AI chat
- Canvas area fills remaining space with centered placeholder text
- ProjectSidebar updated with optional `currentProjectId` prop — active project gets `bg-accent-dim` background and `text-brand` icon color
- `EditorLayoutClient` detects workspace pages via pathname regex and skips rendering its own navbar/sidebar/dialogs — prevents duplicate chrome
- WorkspaceShell now uses `useProjectActions` hook + all three project dialogs (create/rename/delete) — sidebar features work identically to `/editor` home
- Server page fetches all user projects via `getProjects()` and passes to WorkspaceShell for sidebar display
- `useProjectActions.deleteProject` checks both slug and ID in pathname to detect current workspace for redirect
- `useProjectActions.renameProject` navigates to `/editor/${updated.slug}` when renaming the current workspace project (prevents stale-slug AccessDenied)

### Auth Modal Fixes (session 2026-06-18)

- Modal now conditionally renders `<SignIn>` or `<SignUp>` based on `authMode` state (previously only rendered `<SignIn>`)
- Both Clerk components use `routing="hash"` + `forceRedirectUrl="/editor"` for in-modal auth
- Toggle links below Clerk component: "Don't have an account? Sign up" / "Already have an account? Sign in"
- Click interceptor on Clerk container div catches internal Clerk links (`/sign-up`, `/sign-in`) that use path routing despite `routing="hash"`, prevents page navigation, and swaps authMode state instead

### Auth Debugging Notes (session 2026-06-16)

- Root cause of missing two-panel layout: `import { dark } from "@clerk/ui/themes"` in layout.tsx triggered Clerk JS to load `@clerk/ui` from CDN, which rendered `<SignIn />` as a `ReactDOM.createPortal()` into `document.body`, covering the custom grid layout
- Fix: removed the `@clerk/ui` import, removed `theme: dark` from appearance, used Clerk's native appearance API with `variables` only
- Tailwind v4 semantic color classes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `text-secondary-foreground`) do not resolve visually in the browser — must use inline `style` props with CSS variables instead
- Playwright headless browser was essential for diagnosing the issue — `curl` only shows server-rendered HTML, not the client-side DOM state after Clerk JS hydration

### Share Dialog Notes (session 2026-06-18)

- `components/editor/share-dialog.tsx`: Dialog with invite form, collaborator list, copy link
- Share button in workspace navbar now opens the ShareDialog (`shareOpen` state in WorkspaceShell)
- `WorkspaceShell` accepts new `projectSlug` prop (passed from server page via `access.project.slug`)
- API route: `app/api/projects/[projectId]/collaborators/route.ts` — GET (list), POST (invite), DELETE (remove)
- GET: verifies project access (owner or collaborator), enriches collaborator emails with Clerk `fullName` and `imageUrl` via `clerkClient().users.getUserList({ emailAddress })`
- POST: owner-only, validates email format, prevents self-invite, uses `upsert` for idempotency
- DELETE: owner-only, validates collaboratorId belongs to project
- Collaborator data: stored by email in `ProjectCollaborator` — no local user table
- Clerk enrichment fallback: if Clerk user not found for email, shows email only (no avatar, no name)
- ShareDialog renders read-only collaborator list for non-owner collaborators
- Owner section shown at top of collaborator list for non-owner collaborators (muted background, avatar, name, email)
- Copy link copies `${origin}/editor/${projectSlug}` with 2s "Copied!" feedback

### Access Revocation Notes (session 2026-06-18)

- Created `GET /api/projects/[projectId]/access` — lightweight endpoint returning `{ hasAccess: boolean }` using `checkProjectAccess()`
- WorkspaceShell polls every 5s via `setInterval`, checks on `visibilitychange` (tab focus), and checks on ShareDialog open/close
- `useRef` stores the `checkAccess` function for cross-scope access (setInterval callback, event handlers, dialog callbacks)
- On `hasAccess: false`, calls `window.location.reload()` — server re-runs `checkProjectAccess()`, returns `null`, renders `<AccessDenied />`
- Chose reload over redirect to `/editor` so the server component re-evaluates access on the same URL
- Collaborators API (`GET /api/projects/[projectId]/collaborators`) now enriches owner info via `clerkClient().users.getUser(ownerId)` — returns `owner: { name, email, avatarUrl }` alongside collaborators array
- Fixed `getProjects()`: was querying `projectCollaborator.findMany({ email: userId })` where userId is a Clerk ID — now looks up email from Clerk via `clerkClient().users.getUser(userId)` before querying shared projects
- Shared projects appear in the "Shared" tab of ProjectSidebar; collaborators see them read-only (no rename/delete dropdown)
- Owner sees all their projects in "My Projects" tab with full permissions

### Code Quality Fixes (session 2026-06-18)

- `useProjectActions` hook: added `error` state to all three catch blocks (create/rename/delete), previously silent bare catches suppressed errors with no user feedback
- `DeleteProjectDialog`: added `error` prop, renders inline error message; `onOpenChange` guard prevents Escape/backdrop dismiss while `loading` is true
- `ProgressiveBlur` component: removed unused `children` prop from interface and dead `React` import — component is an overlay, not a wrapper
- `share-dialog.tsx`: removed unused `Input` import, suppressed `set-state-in-effect` lint warning (async fetch sets state after await — safe but lint can't verify)

### Canvas Drag-and-Drop Debugging Notes (session 2026-06-20)

- **Root cause 1 — ShapePanel pointer events**: ShapePanel's absolute positioning intercepted pointer events before they reached the canvas wrapper. Fix: `pointer-events-none` on container, `pointer-events-auto` on buttons only.
- **Root cause 2 — Broken `pendingDropRef` pattern**: `pendingDropRef` was a `useRef` set in the drop handler, with a separate `useEffect` reading it and calling `addNodeMutation`. The effect ran only once on mount (empty deps `[]`) and never re-subscribed. Fix: call `addNodeMutation` directly from the React `onDrop` handler — no ref indirection needed.
- **Root cause 3 — Viewport coordinate conversion**: `screenToFlowPosition()` initially tried to read from Liveblocks Storage (`flow.get("viewport")`), which returns the *stored* viewport (stale on first load). Fix: read the viewport transform directly from the `.react-flow__viewport` DOM element's inline `style.transform` or computed `matrix()`.
- **Root cause 4 — React Flow v12 pointer model**: React Flow v12 uses pointer events internally and does not fire native drag/drop events on the `<ReactFlow>` component in all environments. Fix: attach native `dragover`/`drop` DOM listeners to the `.react-flow` element as a fallback, storing the payload in `nativePendingDrop` React state to trigger the mutation within hooks context.
- **Root cause 5 — Missing node dimensions**: React Flow v12 requires `width`/`height` on nodes to size the DOM container; without them, the node is rendered but invisible (`visibility: hidden`). Fix: `addNodeMutation` now writes `width`/`height` from the shape definition; `cleanupMutation` populates missing dimensions for legacy nodes.
- **Root cause 6 — Invisible default color**: The `DEFAULT_NODE_COLOR` (`#1F1F1F` dark gray) was nearly invisible on the dark canvas. Fix: new nodes use a visible indigo default (`#6457f9`); `cleanupMutation` backfills missing colors for legacy nodes.
- **Key lesson**: Never use `useRef` + `useEffect` to bridge native DOM events into React hooks that need to run in the same render context. Either call the mutation directly from the React event handler, or store state that the effect watches.
- **Key lesson**: Always persist node `width`/`height` (or let React Flow know sizing) — nodes without explicit dimensions are invisible in v12.
- **Key lesson**: React Flow v12's viewport transform lives in the DOM (`style.transform` on `.react-flow__viewport`), not in Storage until the user pans/zooms. Don't rely on Storage for initial coordinates.
- Debug console logs were added during investigation and should be cleaned up before production release.

### Canvas Connection Handle Notes (session 2026-06-20)

- **Problem 1 — One-directional handles**: Top and Left were `target`-only, Bottom and Right were `source`-only, forcing users to always connect in a specific direction. Fix: every position gets both a `source` and `target` handle.
- **Problem 2 — Tiny hit targets**: 8×8px (`!w-2 !h-2`) dots were nearly impossible to click accurately. Fix: 12px visible dot (`!w-3 !h-3`) with 24px transparent hit area; `connectionRadius={40}` on ReactFlow snaps to nearest handle within 40px.
- **Problem 3 — Invisible handles**: `opacity-0 group-hover:opacity-100` meant handles only appeared on hover, but the hover class was on the wrong parent. Fix: `group/node` class on the node div, handles use `group-hover/node:opacity-100`.
- **Problem 4 — Wrapper elements broke positioning**: Wrapping source+target handles in `<span>` elements prevented ReactFlow from positioning handles correctly at the node border. Fix: handles must be flat direct children of the node div.
- **Problem 5 — Handle hover feedback**: Needed clear visual feedback on which handle the cursor is over. Fix: `hover:!scale-150 hover:!bg-white hover:!shadow-[0_0_8px_rgba(255,255,255,0.5)]` for individual handle hover state.
- **Key lesson**: ReactFlow handles must be direct children of the node component's root element — any intermediate wrapper (`<span>`, `<div>`) breaks absolute positioning of the handle.
- **Key lesson**: `connectionRadius` is a global ReactFlow prop that makes handles "magnetic" — the user doesn't need to click exactly on the dot, just near the node edge.
- **Key lesson**: When using `group-hover/node`, the parent must have the `group/node` class (not just `group`), and the hover target must be the node div, not the handle itself.

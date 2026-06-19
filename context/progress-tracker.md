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
- feature [6] — Project dialogs: editor home with create CTA, create/rename/delete project dialogs, sidebar project items with dropdown actions, mock data, useProjectDialogs hook
- feature [7] — Prisma setup: Project + ProjectCollaborator models, Prisma client singleton with Accelerate/direct branching, initial migration
- feature [8] — API routes: GET/POST `/api/projects`, PATCH/DELETE `/api/projects/[projectId]`, Clerk auth enforcement, ownership checks (401/403), build passes
- feature [9] — Editor wiring: server-side project fetching, real API mutations, useProjectActions hook, sidebar/dialogs wired to live data, create navigates to workspace, build passes
- feature [10] — Editor workspace shell: `/editor/[roomId]` server page with Clerk auth checks, project access helper (`lib/project-access.ts`), AccessDenied component, workspace layout with project-name navbar, share/AI sidebar toggles, ProjectSidebar with active-room highlighting, canvas placeholder, AI sidebar placeholder
- feature [11] — Share dialog: `ShareDialog` component with invite/remove collaborators (owner-only), Clerk-enriched collaborator list with avatars, copy-link with feedback; API route `GET/POST/DELETE /api/projects/[projectId]/collaborators` with ownership enforcement; wired to workspace navbar Share button; `projectSlug` prop added to WorkspaceShell; access revocation polling (`/api/projects/[projectId]/access`) with 5s interval + tab focus + dialog open/close triggers, reloads to AccessDenied on revocation; owner info shown in collaborator list for non-owner collaborators; fixed shared projects bug: `getProjects()` was querying by Clerk userId instead of email — collaborators now correctly see shared projects in sidebar
- feature [11.1] — Liveblocks setup: `liveblocks.config.ts` with Presence (cursor, isThinking) and UserMeta (name, avatar, color); cached Node client in `lib/liveblocks.ts` with deterministic `getUserColor()` palette helper; `POST /api/liveblocks-auth` route with Clerk auth + project access verification + room auto-creation + ID token issuance with user metadata; build passes
- feature [12] — Canvas integration: `types/canvas.ts` with `CanvasNodeData` (label, color, shape), `CanvasNode`, `CanvasEdge` types; `liveblocks.config.ts` Storage typed with `LiveblocksFlow<CanvasNode, CanvasEdge>`; `canvas-editor.tsx` client wrapper with `LiveblocksProvider` (auth endpoint), `RoomProvider` (room ID, initial presence), `ClientSideSuspense`, error boundary; React Flow wired via `useLiveblocksFlow({ suspense: true })` with synced nodes/edges/change handlers; loose connection mode, fitView, MiniMap, dot-pattern background; workspace-shell placeholder replaced; build passes

## Current Goal

- feature [13] — Next feature TBD

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

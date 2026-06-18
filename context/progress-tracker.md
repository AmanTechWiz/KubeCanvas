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

## Current Goal

- feature [10] — Canvas integration with React Flow and Liveblocks

## Next Up

- Canvas integration with React Flow and Liveblocks

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

### Auth Debugging Notes (session 2026-06-16)

- Root cause of missing two-panel layout: `import { dark } from "@clerk/ui/themes"` in layout.tsx triggered Clerk JS to load `@clerk/ui` from CDN, which rendered `<SignIn />` as a `ReactDOM.createPortal()` into `document.body`, covering the custom grid layout
- Fix: removed the `@clerk/ui` import, removed `theme: dark` from appearance, used Clerk's native appearance API with `variables` only
- Tailwind v4 semantic color classes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `text-secondary-foreground`) do not resolve visually in the browser — must use inline `style` props with CSS variables instead
- Playwright headless browser was essential for diagnosing the issue — `curl` only shows server-rendered HTML, not the client-side DOM state after Clerk JS hydration

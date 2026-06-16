# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1: Foundation

## Completed

- feature [1] — Design system setup: shadcn/ui installation, dark theme CSS variables, component library
- feature [2] — Editor chrome: navbar, project sidebar, editor layout wrapper
- feature [3] — Clerk auth: provider, proxy, sign-in/sign-up pages, route protection, user menu

## Current Goal

- None — feature [3] complete.

## Next Up

- Canvas integration with React Flow and Liveblocks

## Open Questions

- None yet.

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

## Session Notes

- Project uses Next.js 16, React 19, Tailwind v4
- Dark-only theme with CSS custom properties defined in ui-context.md
- Favicon lives in `app/favicon.ico` (App Router convention)
- Installed components: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea
- `lib/utils.ts` provides `cn()` helper using clsx + tailwind-merge
- shadcn Tabs uses @base-ui/react/tabs — TabsPrimitive.Root, TabsPrimitive.List, TabsPrimitive.Tab, TabsPrimitive.Panel
- shadcn Dialog already includes DialogHeader, DialogTitle, DialogDescription, DialogFooter
- EditorNavbar: fixed h-12, left sidebar toggle, right empty, bg-surface with border-b
- ProjectSidebar: floating overlay, w-72, slides from left, Tabs with My Projects/Shared, New Project button
- EditorLayout wraps navbar + sidebar + children, manages sidebar state
- Root layout is clean shell; `/editor` layout applies EditorLayout
- Clerk auth wired: ClerkProvider in root layout with CSS variable overrides (no `@clerk/ui` theme import)
- proxy.ts at root uses clerkMiddleware with createRouteMatcher for public auth routes
- Sign-in/sign-up pages: two-panel grid layout (left branding, right Clerk form), hidden on small screens via `hidden lg:flex`
- Root page (/) redirects authenticated users to /editor, unauthenticated to /sign-in
- UserButton added to editor navbar right section
- Added UI context CSS vars (--bg-base, --bg-surface, --bg-elevated, --text-primary, --text-secondary, --accent-primary, --state-*, etc.) to globals.css for Clerk appearance overrides
- Added NEXT_PUBLIC_CLERK_SIGN_IN_URL and NEXT_PUBLIC_CLERK_SIGN_UP_URL env vars

### Auth Debugging Notes (session 2026-06-16)

- Root cause of missing two-panel layout: `import { dark } from "@clerk/ui/themes"` in layout.tsx triggered Clerk JS to load `@clerk/ui` from CDN, which rendered `<SignIn />` as a `ReactDOM.createPortal()` into `document.body`, covering the custom grid layout
- Fix: removed the `@clerk/ui` import, removed `theme: dark` from appearance, used Clerk's native appearance API with `variables` only
- Tailwind v4 semantic color classes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `text-secondary-foreground`) do not resolve visually in the browser — must use inline `style` props with CSS variables instead
- Playwright headless browser was essential for diagnosing the issue — `curl` only shows server-rendered HTML, not the client-side DOM state after Clerk JS hydration

# AI Implementation — Unified Chat + Architecture Agent

Merge the chat and architect tabs into a single AI chat interface. The LLM decides whether to respond as text or call a tool to modify the canvas. Long-running canvas modifications run in the background via Trigger.dev with real-time status tracking.

## Prerequisites

```bash
npx skills add vercel/ai
bun add ai
```

The project already has `ai`, `@ai-sdk/google`, `@trigger.dev/sdk`, `@trigger.dev/react-hooks`, and `@liveblocks/node` installed — no additional packages needed.

## Steps

### 1. Install AI SDK v7 docs & updates

- `bun add ai@latest` to ensure latest AI SDK v7
- `bun add @ai-sdk/react@latest` for `useChat` hook
- `bun add @ai-sdk/google@latest` for Google provider
- Reference: [Trigger.dev docs](https://trigger.dev/docs/introduction) for task integration patterns
- Reference: [AI SDK docs](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) for `useChat` + tools

### 2. Memory — conversation history

- **In-session memory**: `useChat` stores all messages in React state automatically. No extra code needed — the hook sends the full message array to the server, which passes it to `streamText`.
- **Per-user isolation**: Each collaborator gets their own `useChat` instance. State is per-browser-tab, so User A and User B on the same canvas have independent chat histories. This is the expected UX — each user has their own private AI assistant that can see the shared canvas.
- **Cross-session persistence via localStorage**: Store the full message array to `localStorage` with key `chat-${projectId}-${userId}`. On mount, load saved messages as `initialMessages`. On each new response (`onFinish`), save the updated array. This survives page refresh with zero backend changes. ~10 lines in the sidebar component.
- **Cost control — sliding window**: Send only the last 30 messages to the LLM. Trim the array server-side before passing to `streamText`. If the conversation exceeds 30 exchanges, older messages are dropped from the LLM context. The user still sees the full history in the UI (from localStorage). This is a 2-line slice, implement now.
- **Cross-device persistence via Prisma (future)**: When cross-device history is needed (user logs in from another machine), swap localStorage for Prisma:
  - Add `ChatMessage` model: `{ id, projectId, userId, role, content, parts, createdAt }`
  - Index on `{ projectId, userId, createdAt }`
  - Load via API on mount, save via `onEnd` in `toUIMessageStream`
  - Use `prepareSendMessagesRequest` to send only the last message (server loads rest from DB)
- **Do NOT use AI SDK Memory (agents/memory)**: That page is for cross-session fact storage (user preferences), not conversation history. Not needed here.

### 3. Rewrite the chat API route

Replace `app/api/ai/chat/route.ts` with AI SDK v7 patterns:

- Use `streamText` from `ai` with a single `generateArchitecture` tool
- Use `createUIMessageStreamResponse` + `toUIMessageStream` for the response (not `toTextStreamResponse`)
- Keep the existing `readCanvasState()` and `buildCanvasSummary()` — they already inject real-time canvas context into the system prompt
- Keep guardrails (`validateChatInput`)
- Keep auth via Clerk

The route structure:

```
POST /api/ai/chat
  Body: { messages, projectId, userId }
  Flow:
    1. Auth (Clerk)
    2. Validate messages
    3. Guardrails check
    4. Read canvas state from Liveblocks (existing readCanvasState)
    5. Build system prompt with canvas context
    6. streamText with tools
    7. Return createUIMessageStreamResponse
```

The single `generateArchitecture` tool:

- **Description**: Tells the LLM: "Call this when the user asks to create, modify, or generate architecture. Do NOT call this for discussion questions."
- **Input**: `{ prompt: string, roomId: string }`
- **Execute**: Triggers the existing Trigger.dev design task (`trigger/design-agent.ts`) via `tasks.trigger()`
- **Returns**: `{ runId: string, message: string }` — fast, non-blocking

The route must send/receive the new UIMessage stream protocol (not the legacy text stream that the current route uses). This means the frontend's `useChat` can render tool calls, data parts, and text naturally from `message.parts`.

### 4. Rewrite the AI sidebar frontend

Replace `components/editor/ai-sidebar.tsx`:

- **Single Chat tab** (remove Specs tab for now — the tab bar can have just Chat)
- Use `useChat` from `@ai-sdk/react` (NOT from `ai` — must use the React-specific import for hook support)
- Use `DefaultChatTransport` from `ai` with `api: '/api/ai/chat'`
- Pass `projectId` and `userId` as custom body fields via `sendMessage` options
- Render messages from `message.parts`:
  - `text` parts → render as chat bubbles
  - `tool-call` parts → render a compact architect status card showing "Generating architecture..."
  - `tool-result` parts → render the result (runId, message)
  - `data-*` parts (custom) → render architect progress updates
- Submit sends the user message via `sendMessage({ text: input })`
- Streaming text appears word-by-word as chunks arrive (built-in)
- Keep the Sparkles toggle button in workspace-shell as the sidebar trigger

### 5. Architect status tracking via Trigger.dev

- When the `generateArchitecture` tool returns `{ runId }`, the frontend picks it up from the tool result
- Use `useRealtimeRun` from `@trigger.dev/react-hooks` to subscribe to the run
- While the run is active:
  - Show a status card in the chat: phase name, progress indicator
  - The card updates in real time as the design agent progresses
  - The user can still send new chat messages while architect runs
- When the run completes:
  - The LLM already responded with a summary after the tool call
  - The status card shows "Completed"
  - Canvas updates appear via Liveblocks (no manual refresh needed)

### 6. Live cursor during architect runs

The existing `trigger/design-agent.ts` already handles this:
- Sets `agentCursor` presence via Liveblocks REST API during node placement
- Removes cursor when done
- The existing `live-cursors.tsx` renders other users' cursors (including AI agent)

**No changes needed** — this already works end-to-end.

### 7. System prompt — unified

Create a single system prompt that replaces both `chat_system_prompt.ts` and `ai_system_prompt.ts`:

- Instructs the model to respond as a senior architect
- Explains both modes: "Respond with text for discussion questions. Call generateArchitecture for canvas modifications."
- Canvas context is appended dynamically (same as current pattern)
- Explicitly tells the model WHEN to call the tool vs respond with text
- Mention all the brands , shapes available and should always make neat and clean diagram , not cluttered.
- Not to add/delete unneccessary complicated to an architecture , should only do when needed.


---

## Scope Limits

- Do not implement the Specs tab — Chat only
- Do not rebuild the design agent (`trigger/design-agent.ts`) — it's already complete
- Do not change Liveblocks feed infrastructure (we're removing feed dependency for chat)
- Do not add multi-step tool approval or complex agent loops — single tool call is enough
- Do not use AI SDK agents (ToolLoopAgent, WorkflowAgent) — `useChat` + `streamText` is simpler

---

## Files to Create/Modify

| File | Action |
|---|---|
| `app/api/ai/chat/route.ts` | **Rewrite** — AI SDK streamText + generateArchitecture tool + UIMessageStream |
| `components/editor/ai-sidebar.tsx` | **Rewrite** — useChat hook, render message.parts, tool call cards, architect status |
| `trigger/ai_system_prompt.ts` | **Rewrite** — unified prompt describing chat + tool-calling modes |
| `trigger/chat_system_prompt.ts` | **Delete** (merged into unified prompt) |
| `types/tasks.ts` | **Update** — add custom data part types for architect status |
| `prisma/schema.prisma` | **Update** — add `ChatMessage` model |
| `app/api/ai/chat/messages/route.ts` | **Create** — GET/POST for chat messages (load/save from Prisma) |
| `app/api/ai/design/route.ts` | **Keep** — still used for token generation |
| `trigger/design-agent.ts` | **Keep** — already complete |

---

## Check When Done

- Chat API route uses `streamText` with `generateArchitecture` tool
- Single Chat tab in sidebar with `useChat` hook
- User can chat about architecture — AI responds as text
- User asks to modify canvas — AI calls `generateArchitecture` tool, Trigger.dev runs, status appears
- Canvas updates appear via Liveblocks with AI cursor
- Multiple collaborators each have independent chat sessions
- Streaming text appears in real time
- Chat history survives page refresh via localStorage
- Only last 30 messages sent to LLM (sliding window server-side)
- Prisma `ChatMessage` model created with migration
- Chat history persists across devices via Prisma
- Old messages loaded from DB on mount, saved on each response
- `bun run build` passes

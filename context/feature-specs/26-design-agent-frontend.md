Wire up the AI sidebar so users can submit design prompts, track AI run status
in real time, and reflect AI-driven canvas updates through Liveblocks.

### Implementation

1. Submit from AI sidebar

- On submit:
  - push the user message to the `ai-chat` feed
  - call `POST /api/ai/design` with `{ prompt, roomId }`
  - read `{ runId, publicToken }` from the response
- store `runId` and `publicToken` in local state

2. Run status tracking

- Use `useRealtimeRun(runId, { accessToken: publicToken })`
- While the run is active:
  - disable the chat input
  - show a loading state (spinner in the button is enough) : 
  
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" role="img" aria-label="Spiral"><title>Spiral</title><desc>A bright trace winds outward from the center.</desc><defs><circle id="b" r="2.4" fill="#ffffff" opacity="0.07"/><circle id="l" r="3.1"/></defs><style>.l{fill:#ffffff;opacity:0;animation:icon-02-k 2800ms cubic-bezier(0.25, 1, 0.5, 1) infinite both;}@keyframes icon-02-k{0%{opacity:0;}4%{opacity:1;}26%{opacity:0.08;}100%{opacity:0;}}@media (prefers-reduced-motion:reduce){.l{animation:none;opacity:0.45;}}.d00{animation-delay:2221ms;}.d01{animation-delay:2317ms;}.d02{animation-delay:869ms;}.d03{animation-delay:966ms;}.d04{animation-delay:1062ms;}.d10{animation-delay:2124ms;}.d11{animation-delay:772ms;}.d12{animation-delay:97ms;}.d13{animation-delay:193ms;}.d14{animation-delay:1159ms;}.d20{animation-delay:2028ms;}.d21{animation-delay:676ms;}.d22{animation-delay:0ms;}.d23{animation-delay:290ms;}.d24{animation-delay:1255ms;}.d30{animation-delay:1931ms;}.d31{animation-delay:579ms;}.d32{animation-delay:483ms;}.d33{animation-delay:386ms;}.d34{animation-delay:1352ms;}.d40{animation-delay:1834ms;}.d41{animation-delay:1738ms;}.d42{animation-delay:1641ms;}.d43{animation-delay:1545ms;}.d44{animation-delay:1448ms;}</style><use href="#b" x="6" y="6"/><use href="#b" x="17" y="6"/><use href="#b" x="28" y="6"/><use href="#b" x="39" y="6"/><use href="#b" x="50" y="6"/><use href="#b" x="6" y="17"/><use href="#b" x="17" y="17"/><use href="#b" x="28" y="17"/><use href="#b" x="39" y="17"/><use href="#b" x="50" y="17"/><use href="#b" x="6" y="28"/><use href="#b" x="17" y="28"/><use href="#b" x="28" y="28"/><use href="#b" x="39" y="28"/><use href="#b" x="50" y="28"/><use href="#b" x="6" y="39"/><use href="#b" x="17" y="39"/><use href="#b" x="28" y="39"/><use href="#b" x="39" y="39"/><use href="#b" x="50" y="39"/><use href="#b" x="6" y="50"/><use href="#b" x="17" y="50"/><use href="#b" x="28" y="50"/><use href="#b" x="39" y="50"/><use href="#b" x="50" y="50"/><use class="l d00" href="#l" x="6" y="6"/><use class="l d01" href="#l" x="17" y="6"/><use class="l d02" href="#l" x="28" y="6"/><use class="l d03" href="#l" x="39" y="6"/><use class="l d04" href="#l" x="50" y="6"/><use class="l d10" href="#l" x="6" y="17"/><use class="l d11" href="#l" x="17" y="17"/><use class="l d12" href="#l" x="28" y="17"/><use class="l d13" href="#l" x="39" y="17"/><use class="l d14" href="#l" x="50" y="17"/><use class="l d20" href="#l" x="6" y="28"/><use class="l d21" href="#l" x="17" y="28"/><use class="l d22" href="#l" x="28" y="28"/><use class="l d23" href="#l" x="39" y="28"/><use class="l d24" href="#l" x="50" y="28"/><use class="l d30" href="#l" x="6" y="39"/><use class="l d31" href="#l" x="17" y="39"/><use class="l d32" href="#l" x="28" y="39"/><use class="l d33" href="#l" x="39" y="39"/><use class="l d34" href="#l" x="50" y="39"/><use class="l d40" href="#l" x="6" y="50"/><use class="l d41" href="#l" x="17" y="50"/><use class="l d42" href="#l" x="28" y="50"/><use class="l d43" href="#l" x="39" y="50"/><use class="l d44" href="#l" x="50" y="50"/></svg>

- When the run completes:
  - push a final AI message to `ai-chat`
  - reset loading + run state

3. Canvas updates (realtime)

- Do not manually update nodes/edges
- Rely on Liveblocks (`useLiveblocksFlow`) to reflect changes in real time
- AI updates to nodes, edges, and presence should appear automatically

4. Status display

- Read the latest message from `ai-status-feed`
- Show a compact status strip above the input only when a run is active

### UI Details

- Use existing design tokens from `global.css` (do not introduce new colors)
- Follow `ui-context.md` for layout and visual consistency

Chat bubbles

- based on current ui of chat box choose best colors for ai and user.

Submit button

- Disabled: dimmed state
- While running: show spinner

Status strip

- Compact bar above input
- Dark base + green accent
- Subtle animated indicator is fine
- if error : clear error message with red accent.

General

- Use Tailwind + shadcn/ui only
- Keep current layout intact
- Show errors as messages in `ai-chat` feed

### Scope Limits

- Do not implement backend or Trigger.dev logic
- Do not fetch final graph data
- Do not redesign the sidebar
- Do not hardcode a new theme outside existing tokens
- Do not manually sync canvas state

---

### Notes

- Follow Liveblocks best practices for feeds (`ai-chat`, `ai-status-feed`)
- Keep everything collaborative, all updates should be visible across clients

---

### Check When Done

- Submitting a prompt calls `/api/ai/design` and returns a `runId`
- `useRealtimeRun` connects using the returned token
- Input is disabled while the run is active
- Status strip appears only during active runs
- Chat updates appear across multiple sessions
- No TypeScript or build errors
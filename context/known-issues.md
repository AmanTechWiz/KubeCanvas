## Resolved issues :

In architect tab (in chat box) -

1. ~~The ai takes the canvas state but when asked to do stuff like delete all nodes it should reach to the delete all (trash can button and press yes) but instead it keeps adding more nodes and moving stuff here and there.~~ — **FIXED** in feature [34]: rewrote architect agent from JSON patch operations to AI SDK tool calling with explicit `deleteAllNodes` tool and system prompt instruction; tools execute via `mutateFlow()` directly on Liveblocks Storage.

2. ~~add autonomous building and understand layer for the architect layer. use trigger dev and liveblocks docs/skills/mcp to implement~~ — **FIXED** in feature [34]: implemented autonomous AI cursor using Liveblocks Presence + REST API; the agent moves its cursor across the canvas while executing tool calls, with animated purple cursor arrow and thinking spinner; all 9 tools (add/move/update/delete node/edge, moveMultipleNodes) execute sequentially with visual cursor feedback.

## when to stop :

1. ~~We have full working model of ai having it's own cursor to move on the canvas to modify stuff, architect agent work perfectly fine with correct responses.~~ — **DONE** via feature [34].

2. ~~That ai cursor should have all access to the cursor.~~ — **DONE** via feature [34] — cursor has full canvas access through all 9 tools.


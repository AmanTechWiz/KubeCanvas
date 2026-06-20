DRAG AND DROP ISSUE : RESOLVED

- **Root cause 1**: ReactFlow v12 removed `onDrop` / `onDragOver` as component props. Old code passed these to `<ReactFlow>`, which silently spread them to the root HTML div. **Fix**: Moved handlers to a wrapper `<div>` that receives events via bubbling.
- **Root cause 2**: Manual viewport transform parsing (`readViewportTransform`) was fragile. **Fix**: Replaced with standalone DOM-based `screenToFlowPosition()` (no `useReactFlow` since FlowCanvas is a parent of ReactFlow, not a child).
- **Root cause 3**: `CanvasError` wrapper had no explicit height/width. **Fix**: Added `h-full w-full` via a wrapping div in `CanvasError`.
- **Root cause 4**: `ShapePanel` at `z-50` intercepted pointer events. **Fix**: `pointer-events-none` on the panel container, `pointer-events-auto` on the draggable buttons.
- **Root cause 5 (CRITICAL)**: `pendingDropRef` + `useEffect` pattern was broken. The `useEffect` depended on `addNodeMutation` (which has empty deps `[]`), so it only ran once on mount. After that, setting `pendingDropRef.current` never triggered the effect. Nodes were never created. **Fix**: Removed the ref+useEffect indirection. Called `addNodeMutation` directly from `handleDrop`. Since `onDrop` on the wrapper div is a React synthetic event handler (React attaches via delegation), `addNodeMutation` IS within the hooks context and works correctly.

WHEN TO STOP AFTER COMPLETING THE TASK :

- When nodes can be dragged from the node panel and dropped onto the canvas correctly and it should be rendered on the canvas correctly.
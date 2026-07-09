"use client"

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
} from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react"

// ── CanvasEdge ──────────────────────────────────────────────────────
// Custom right-angle edge with:
//  • dimmed rest state, brightened on hover / selection
//  • built-in interaction width for easy clicking
//  • inline label editing on double-click
//  • EdgeLabelRenderer with midpoint coordinates from getSmoothStepPath
//
// Arrow is rendered by React Flow's markerEnd system on BaseEdge — the
// arrow always appears at the END of the path (the target node).

function CanvasEdgeInner(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
    markerEnd,
  } = props

  const { updateEdge } = useReactFlow()

  // ── Path calculation ────────────────────────────────────────────
  // Always use right-angle (smooth-step) routing for clean bends.
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  })

  // ── Hover / selection state ─────────────────────────────────────
  const [hovered, setHovered] = useState(false)
  const isActive = hovered || !!selected

  // ── Label editing state ─────────────────────────────────────────
  const label = (data as Record<string, unknown> | undefined)?.label as
    | string
    | undefined
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label || "")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [editing])

  const commitLabel = useCallback(() => {
    setEditing(false)
    const value = draft.trim()
    updateEdge(id, {
      data: { ...(data as Record<string, unknown> || {}), label: value || undefined },
    })
  }, [id, draft, data, updateEdge])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setDraft(label || "")
  }, [label])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setDraft(label || "")
      setEditing(true)
    },
    [label],
  )

  const stopPropagation = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent | React.PointerEvent) => {
      e.stopPropagation()
    },
    [],
  )

  const edgeStroke = isActive
    ? "rgba(255,255,255,0.7)"
    : "rgba(255,255,255,0.25)"

  // Dynamic arrow color that brightens on hover/selection
  const arrowColor = isActive
    ? "rgba(255,255,255,0.7)"
    : "rgba(255,255,255,0.45)"

  // Dashed stroke when selected to provide clear visual feedback
  const strokeDasharray = selected ? "6 3" : undefined

  return (
    <>
      {/* ── Edge path — markerStart puts arrow at source, markerEnd at target ── */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          stroke: edgeStroke,
          strokeWidth: selected ? 2.5 : 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeDasharray,
          transition: "stroke 150ms ease, stroke-width 150ms ease",
        }}
      />

      {/* ── Inline label ────────────────────────────────────────── */}
      <EdgeLabelRenderer>
        {editing ? (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === "Enter") {
                  e.preventDefault()
                  commitLabel()
                }
                if (e.key === "Escape") {
                  cancelEdit()
                }
              }}
              onPointerDown={stopPropagation}
              className="bg-black/80 border border-white/20 rounded-full px-2.5 py-0.5 text-xs font-medium text-white outline-none backdrop-blur-sm min-w-[40px] max-w-[160px]"
              style={{ width: Math.max(40, draft.length * 7 + 20) }}
              placeholder="Label"
            />
          </div>
        ) : label ? (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
            onDoubleClick={handleDoubleClick}
          >
            <span className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-sm border border-white/[0.12] px-2 py-0.5 text-xs font-medium text-white/80 cursor-text select-none hover:bg-white/[0.08] transition-colors">
              {label}
            </span>
          </div>
        ) : isActive ? (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
            onDoubleClick={handleDoubleClick}
          >
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] text-white/20 cursor-text select-none">
              Add label
            </span>
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  )
}

export const CanvasEdgeComponent = memo(CanvasEdgeInner)

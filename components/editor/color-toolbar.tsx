"use client"

import { useCallback, useState } from "react"
import { NODE_COLORS, type NodeColor } from "@/types/canvas"

interface ColorToolbarProps {
  /** Current node background color — used to highlight the active swatch. */
  activeColor: string
  /** Called when a swatch is clicked. Passes the selected NodeColor pair. */
  onSelect: (color: NodeColor) => void
}

/**
 * Floating toolbar that renders one swatch per predefined color pair.
 * Shown only when a canvas node is selected.
 *
 * Pointer events are stopped from propagating so interacting with the
 * toolbar never triggers node dragging or canvas panning.
 */
export function ColorToolbar({ activeColor, onSelect }: ColorToolbarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const stop = useCallback(
    (e: React.SyntheticEvent) => {
      e.stopPropagation()
      e.preventDefault()
    },
    [],
  )

  return (
    <div
      className="absolute -top-11 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/[0.08] bg-black/70 px-2 py-1.5 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.45)]"
      onPointerDown={stop}
      onPointerUp={stop}
      onPointerMove={stop}
      onPointerEnter={stop}
      onPointerLeave={(e) => {
        stop(e)
        setHoveredIdx(null)
      }}
      onClick={stop}
      onDoubleClick={stop}
      onWheel={stop}
      style={{ pointerEvents: "auto" }}
    >
      {NODE_COLORS.map((c, i) => {
        const isActive = activeColor.toLowerCase() === c.bg.toLowerCase()
        const isHovered = hoveredIdx === i

        return (
          <button
            key={c.label}
            type="button"
            title={c.label}
            onPointerDown={stop}
            onPointerUp={(e) => {
              stop(e)
              onSelect(c)
            }}
            onPointerEnter={(e) => {
              stop(e)
              setHoveredIdx(i)
            }}
            onPointerLeave={stop}
            onClick={stop}
            className="relative h-5 w-5 shrink-0 rounded-full border-2 transition-transform duration-150"
            style={{
              background: c.bg,
              borderColor: isActive ? c.text : "rgba(255,255,255,0.15)",
              transform: isHovered ? "scale(1.25)" : "scale(1)",
              boxShadow: isHovered
                ? `0 0 8px 1px ${c.text}44`
                : isActive
                  ? `0 0 6px 0px ${c.text}33`
                  : "none",
            }}
          >
            {/* Inner dot indicates the text color */}
            <span
              className="absolute inset-0 m-auto block h-1.5 w-1.5 rounded-full"
              style={{ background: c.text }}
            />
          </button>
        )
      })}
    </div>
  )
}

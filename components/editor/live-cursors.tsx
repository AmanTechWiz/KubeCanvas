"use client"

import { useMemo } from "react"
import { useOthers } from "@liveblocks/react"
import { getUserColor } from "@/lib/liveblocks"

/** Returns "#fff" or "#111" depending on the perceived luminance of a hex color. */
function contrastingTextColor(hex: string): string {
  try {
    const raw = hex.replace("#", "")
    const r = parseInt(raw.substring(0, 2), 16) / 255
    const g = parseInt(raw.substring(2, 4), 16) / 255
    const b = parseInt(raw.substring(4, 6), 16) / 255
    // sRGB relative luminance (ITU-R BT.709)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luminance > 0.45 ? "#111" : "#fff"
  } catch {
    return "#fff"
  }
}

interface LiveCursorsProps {
  /** Current user's Clerk ID — cursors for this user are never rendered. */
  currentUserId: string
  /** Current React Flow viewport transform: { x, y, zoom }. */
  viewport: { x: number; y: number; zoom: number }
}

/**
 * Renders live cursors for all other participants on the canvas.
 * Each cursor is a small colored pointer with a name badge.
 * The current user's own cursor is never rendered.
 *
 * Cursor positions are stored as screen coordinates (relative to the
 * React Flow container) and converted to absolute pixel positions
 * using the viewport transform so they track pan/zoom correctly.
 */
export function LiveCursors({ currentUserId, viewport }: LiveCursorsProps) {
  const others = useOthers()

  const cursors = useMemo(() => {
    return others
      .filter((other) => {
        const cursor = other.presence.cursor
        return cursor !== null && cursor !== undefined
      })
      .map((other) => {
        const cursor = other.presence.cursor!
        const info = other.info
        const color = info?.color ?? getUserColor(other.id)
        const name = info?.name ?? "User"
        const initials = name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
        const textColor = contrastingTextColor(color)

        // Convert flow coordinates → absolute screen position inside
        // the React Flow container using the viewport transform.
        const absX = cursor.x * viewport.zoom + viewport.x
        const absY = cursor.y * viewport.zoom + viewport.y

        return {
          id: other.id,
          absX,
          absY,
          color,
          textColor,
          name,
          initials,
        }
      })
  }, [others, viewport])

  if (cursors.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-[62] overflow-hidden">
      {cursors.map((c) => (
        <div
          key={c.id}
          className="absolute"
          style={{
            left: c.absX,
            top: c.absY,
            transform: "translate(-1px, -1px)",
          }}
        >
          {/* Cursor pointer */}
          <svg
            width="18"
            height="22"
            viewBox="0 0 18 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-md"
          >
            <path
              d="M1 1L7.5 19L10 11L18 8.5L1 1Z"
              fill={c.color}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>

          {/* Name badge */}
          <div
            className="absolute left-3.5 top-4 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow-lg"
            style={{ backgroundColor: c.color, color: c.textColor }}
          >
            {c.name}
          </div>
        </div>
      ))}
    </div>
  )
}

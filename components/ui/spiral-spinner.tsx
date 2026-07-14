"use client"

/**
 * SpiralSpinner — animated dot-grid loading indicator.
 * Extracted from ai-sidebar.tsx and agent-cursor.tsx to eliminate duplication.
 * Keyframes are defined in globals.css (.sp, .d00–.d44 classes).
 */
export function SpiralSpinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      role="img"
      aria-label="Thinking"
      className={className}
    >
      <defs>
        <circle id="sp-bg" r="2.4" fill="#ffffff" opacity="0.07" />
        <circle id="sp-dot" r="3.1" />
      </defs>
      {[6, 17, 28, 39, 50].map((x) =>
        [6, 17, 28, 39, 50].map((y) => (
          <use key={`bg-${x}-${y}`} href="#sp-bg" x={x} y={y} />
        )),
      )}
      {[
        [6, 6, "d00"], [17, 6, "d01"], [28, 6, "d02"], [39, 6, "d03"], [50, 6, "d04"],
        [6, 17, "d10"], [17, 17, "d11"], [28, 17, "d12"], [39, 17, "d13"], [50, 17, "d14"],
        [6, 28, "d20"], [17, 28, "d21"], [28, 28, "d22"], [39, 28, "d23"], [50, 28, "d24"],
        [6, 39, "d30"], [17, 39, "d31"], [28, 39, "d32"], [39, 39, "d33"], [50, 39, "d34"],
        [6, 50, "d40"], [17, 50, "d41"], [28, 50, "d42"], [39, 50, "d43"], [50, 50, "d44"],
      ].map(([x, y, cls]) => (
        <use key={`d-${x}-${y}`} className={`sp ${cls}`} href="#sp-dot" x={x} y={y} />
      ))}
    </svg>
  )
}

import { cn } from "@/lib/utils"

export function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]"
        )}
      />
      {/* Radial gradient for the container to give a faded look */}
      <div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{
          maskImage:
            "radial-gradient(ellipse at center, transparent 20%, black)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, transparent 20%, black)",
        }}
      />
      {/* Slight dim overlay to reduce grid visibility by ~1% */}
      <div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{ opacity: 0.4 }}
      />
    </div>
  )
}

"use client"

import React from "react"
import { Glass, type GlassOptics } from "@samasante/liquid-glass"
import { DARK_GLASS, GLASS_BG } from "@/lib/liquid-glass-config"

/**
 * Renders a liquid-glass background behind its children.
 * The <Glass> is an absolutely-positioned sibling — it NEVER wraps the children,
 * so flex layouts and normal flow are preserved.
 *
 * All extra props (event handlers, data-*, etc.) are forwarded to the outer div.
 */
export function GlassBg({
  children,
  optics = DARK_GLASS,
  background = "rgba(10,10,13,0.7)",
  className,
  style,
  ...divProps
}: {
  children: React.ReactNode
  optics?: Partial<GlassOptics>
  background?: string
  className?: string
  style?: React.CSSProperties
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} style={{ position: "relative", ...style }} {...divProps}>
      <Glass
        optics={optics}
        behind={GLASS_BG}
        className="absolute inset-0 pointer-events-none"
        style={{ background, borderRadius: "inherit" }}
      />
      {children}
    </div>
  )
}

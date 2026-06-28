"use client"

import React, { useEffect, useRef, useState } from "react"
import { useOther, useOthers } from "@liveblocks/react"

// ── Constants ──────────────────────────────────────────────────────────
const AI_AGENT_ID = "ai-agent"

// ── Spiral Spinner (shared with ai-sidebar.tsx) ───────────────────────
function SpiralSpinner({ className }: { className?: string }) {
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
      <style>{`
        .sp{fill:#ffffff;opacity:0;animation:sp-k 2800ms cubic-bezier(0.25,1,0.5,1) infinite both;}
        @keyframes sp-k{0%{opacity:0;}4%{opacity:1;}26%{opacity:0.08;}100%{opacity:0;}}
        @media(prefers-reduced-motion:reduce){.sp{animation:none;opacity:0.45;}}
        .d00{animation-delay:2221ms;}.d01{animation-delay:2317ms;}.d02{animation-delay:869ms;}.d03{animation-delay:966ms;}.d04{animation-delay:1062ms;}
        .d10{animation-delay:2124ms;}.d11{animation-delay:772ms;}.d12{animation-delay:97ms;}.d13{animation-delay:193ms;}.d14{animation-delay:1159ms;}
        .d20{animation-delay:2028ms;}.d21{animation-delay:676ms;}.d22{animation-delay:0ms;}.d23{animation-delay:290ms;}.d24{animation-delay:1255ms;}
        .d30{animation-delay:1931ms;}.d31{animation-delay:579ms;}.d32{animation-delay:483ms;}.d33{animation-delay:386ms;}.d34{animation-delay:1352ms;}
        .d40{animation-delay:1834ms;}.d41{animation-delay:1738ms;}.d42{animation-delay:1641ms;}.d43{animation-delay:1545ms;}.d44{animation-delay:1448ms;}
      `}</style>
      {[6,17,28,39,50].map(x => [6,17,28,39,50].map(y => (
        <use key={`bg-${x}-${y}`} href="#sp-bg" x={x} y={y} />
      )))}
      {[
        [6,6,"d00"],[17,6,"d01"],[28,6,"d02"],[39,6,"d03"],[50,6,"d04"],
        [6,17,"d10"],[17,17,"d11"],[28,17,"d12"],[39,17,"d13"],[50,17,"d14"],
        [6,28,"d20"],[17,28,"d21"],[28,28,"d22"],[39,28,"d23"],[50,28,"d24"],
        [6,39,"d30"],[17,39,"d31"],[28,39,"d32"],[39,39,"d33"],[50,39,"d34"],
        [6,50,"d40"],[17,50,"d41"],[28,50,"d42"],[39,50,"d43"],[50,50,"d44"],
      ].map(([x, y, cls]) => (
        <use key={`d-${x}-${y}`} className={`sp ${cls}`} href="#sp-dot" x={x} y={y} />
      ))}
    </svg>
  )
}

// ── Viewport reader ────────────────────────────────────────────────────
// Reads the current React Flow viewport transform from the DOM.
// This avoids needing useReactFlow() — the cursor lives outside the
// ReactFlow component tree.

interface Viewport {
  x: number
  y: number
  zoom: number
}

function readViewport(): Viewport {
  const el = document.querySelector(".react-flow__viewport") as HTMLElement | null
  if (!el) return { x: 0, y: 0, zoom: 1 }

  const transform = el.style.transform || window.getComputedStyle(el).transform || ""
  let tx = 0, ty = 0, zoom = 1

  const m = transform.match(
    /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/,
  )
  if (m) {
    tx = parseFloat(m[1])
    ty = parseFloat(m[2])
    zoom = parseFloat(m[3])
  } else {
    const mx = transform.match(
      /matrix\(([-\d.e]+),\s*[-\d.e]+,\s*[-\d.e]+,\s*[-\d.e]+,\s*([-\d.e]+),\s*([-\d.e]+)\)/,
    )
    if (mx) {
      zoom = parseFloat(mx[1])
      tx = parseFloat(mx[2])
      ty = parseFloat(mx[3])
    }
  }

  return { x: tx, y: ty, zoom }
}

// ── Component ──────────────────────────────────────────────────────────
// Renders the AI agent's cursor on the canvas. The agent sets its
// position via the Liveblocks REST API (presence). This component
// reads that presence and renders a purple cursor with wobble animation.

export function AgentCursor() {
  const others = useOthers()
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })

  // Find the AI agent in others
  const agent = others.find((o) => o.connectionId === -1 || o.id === AI_AGENT_ID)

  // Track viewport changes via MutationObserver
  useEffect(() => {
    const readAndSet = () => setViewport(readViewport())
    readAndSet()

    const el = document.querySelector(".react-flow__viewport")
    if (!el) return

    const observer = new MutationObserver(readAndSet)
    observer.observe(el, { attributes: true, attributeFilter: ["style"] })

    return () => observer.disconnect()
  }, [])

  if (!agent) return null

  const agentCursor = (agent.presence as any)?.agentCursor
  const isThinking = (agent.presence as any)?.isThinking ?? false

  if (!agentCursor) return null

  // Convert canvas coordinates → screen coordinates
  const screenX = agentCursor.x * viewport.zoom + viewport.x
  const screenY = agentCursor.y * viewport.zoom + viewport.y

  return (
    <div
      className="pointer-events-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${screenX}px, ${screenY}px)`,
        zIndex: 99999,
        transition: "transform 200ms cubic-bezier(0.25, 0.1, 0.25, 1)",
      }}
    >
      <style>{`
        .agent-cursor-wobble-x {
          animation: agent-wobble-x 3s ease-in-out infinite;
        }
        .agent-cursor-wobble-y {
          animation: agent-wobble-y 2.5s ease-in-out infinite;
        }
        @keyframes agent-wobble-x {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(2px); }
          75% { transform: translateX(-2px); }
        }
        @keyframes agent-wobble-y {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-1px); }
          75% { transform: translateY(1px); }
        }
      `}</style>
      {/* Cursor arrow */}
      <div className="agent-cursor-wobble-x">
        <div className="agent-cursor-wobble-y">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: "drop-shadow(0 2px 4px rgba(100,87,249,0.4))",
            }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z"
              fill="#6457f9"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Name badge */}
      <div
        style={{
          marginLeft: 18,
          marginTop: -2,
          padding: "2px 8px",
          borderRadius: "4px",
          backgroundColor: "#6457f9",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: "nowrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        {isThinking ? (
          <span className="flex items-center gap-1.5">
            <SpiralSpinner className="size-3.5" />
            Thinking…
          </span>
        ) : (
          "KubeAI"
        )}
      </div>
    </div>
  )
}

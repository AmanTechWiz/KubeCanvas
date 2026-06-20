"use client"

import { memo } from "react"
import type { ReactFlowInstance } from "@xyflow/react"

// ── Icon helpers (inline SVGs — no external dependency) ─────────────

function ZoomInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}

function ZoomOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}

function FitViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
    </svg>
  )
}

// ── Control button ────────────────────────────────────────────────

function ControlButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center justify-center w-7 h-7 rounded-md text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/60"
    >
      {children}
    </button>
  )
}

// ── Divider ───────────────────────────────────────────────────────

function Divider() {
  return <div className="w-px h-4 bg-white/[0.12] mx-1" />
}

// ── Canvas controls bar ───────────────────────────────────────────

interface CanvasControlsProps {
  reactFlowInstance: ReactFlowInstance | null
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

function CanvasControlsInner({
  reactFlowInstance,
  canUndo,
  canRedo,
  undo,
  redo,
}: CanvasControlsProps) {
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[61]">
      <div className="flex items-center gap-0.5 rounded-xl border border-white/[0.08] bg-black/60 backdrop-blur-xl px-1.5 py-1 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
        {/* ── Zoom controls ──────────────────────────────────── */}
        <ControlButton
          onClick={() => reactFlowInstance?.zoomOut({ duration: 150 })}
          title="Zoom out (-)"
        >
          <ZoomOutIcon />
        </ControlButton>

        <ControlButton
          onClick={() => reactFlowInstance?.fitView({ duration: 200, padding: 0.2 })}
          title="Fit view"
        >
          <FitViewIcon />
        </ControlButton>

        <ControlButton
          onClick={() => reactFlowInstance?.zoomIn({ duration: 150 })}
          title="Zoom in (+)"
        >
          <ZoomInIcon />
        </ControlButton>

        <Divider />

        {/* ── History controls ────────────────────────────────── */}
        <ControlButton
          onClick={undo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
        >
          <UndoIcon />
        </ControlButton>

        <ControlButton
          onClick={redo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
        >
          <RedoIcon />
        </ControlButton>
      </div>
    </div>
  )
}

export const CanvasControls = memo(CanvasControlsInner)

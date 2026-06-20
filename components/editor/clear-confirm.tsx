"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Trash2 } from "lucide-react"

interface ClearConfirmProps {
  onConfirm: () => void
}

export function ClearConfirmButton({ onConfirm }: ClearConfirmProps) {
  const [open, setOpen] = useState(false)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  return (
    <div className="relative pointer-events-auto">
      {/* Trash circle button */}
      <button
        onClick={() => setOpen(true)}
        title="Clear canvas"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-muted-foreground backdrop-blur-xl transition-colors hover:bg-white/[0.08] hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Centered glassy confirmation dialog via portal */}
      {open &&
        createPortal(
          <>
            {/* Backdrop — matches AI sidebar / dialog overlay */}
            <div
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs supports-backdrop-filter:backdrop-blur-xs"
              onClick={() => setOpen(false)}
            />

            {/* Dialog card — centered on screen */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center">
              <div
                className="w-full max-w-xs rounded-2xl border border-white/[0.08] bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-150 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_0.5px_0_rgba(255,255,255,0.06)]"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-4 text-center text-sm font-semibold text-foreground">
                  Clear entire canvas?
                </p>
                <p className="mb-4 text-center text-xs text-muted-foreground">
                  This will remove all shapes and cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xl transition-colors hover:bg-white/[0.08] hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onConfirm()
                      setOpen(false)
                    }}
                    className="flex-1 rounded-xl bg-red-500/80 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}

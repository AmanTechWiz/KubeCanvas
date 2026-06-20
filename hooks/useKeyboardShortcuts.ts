"use client"

import { useEffect } from "react"
import type { ReactFlowInstance } from "@xyflow/react"

interface UseKeyboardShortcutsOptions {
  reactFlowInstance: ReactFlowInstance | null
  undo: () => void
  redo: () => void
}

/** Tags whose keyboard events should be ignored (editable fields). */
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])
const EDITABLE_ROLE = new Set(["textbox", "searchbox", "combobox"])

function isEditableTarget(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement
  if (el.isContentEditable) return true
  if (EDITABLE_TAGS.has(el.tagName)) return true
  const role = el.getAttribute("role")
  if (role && EDITABLE_ROLE.has(role)) return true
  return false
}

export function useKeyboardShortcuts({
  reactFlowInstance,
  undo,
  redo,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!reactFlowInstance) return

    function handleKeyDown(e: KeyboardEvent) {
      // Skip shortcuts when typing in inputs, textareas, or contentEditable
      if (isEditableTarget(e)) return

      const mod = e.metaKey || e.ctrlKey

      // +/- zoom
      if (!mod && (e.key === "+" || e.key === "=")) {
        e.preventDefault()
        reactFlowInstance!.zoomIn({ duration: 150 })
        return
      }
      if (!mod && e.key === "-") {
        e.preventDefault()
        reactFlowInstance!.zoomOut({ duration: 150 })
        return
      }

      // Cmd/Ctrl+Z → undo
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Cmd/Ctrl+Shift+Z → redo
      if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault()
        redo()
        return
      }

      // Cmd/Ctrl+Y → redo
      if (mod && e.key === "y") {
        e.preventDefault()
        redo()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reactFlowInstance, undo, redo])
}

"use client"

import { createContext, useContext } from "react"

interface EditorContextValue {
  openCreate: () => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error("useEditor must be used within EditorLayout")
  return ctx
}

export { EditorContext }

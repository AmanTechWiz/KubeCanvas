"use client"

import { PanelLeftOpen, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EditorNavbarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onCloseSidebar: () => void
}

export function EditorNavbar({ sidebarOpen, onToggleSidebar, onCloseSidebar }: EditorNavbarProps) {
  return (
    <nav className="relative z-[60] flex h-12 items-center border-b border-border bg-surface px-3">
      <div className="flex items-center">
        {!sidebarOpen ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleSidebar}
            aria-label="Open sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex w-72 items-center justify-between pr-3">
            <h2 className="text-sm font-medium text-foreground">Projects</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCloseSidebar}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center" />
    </nav>
  )
}

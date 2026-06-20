"use client"

import { PanelLeftOpen, PanelLeftClose } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

interface EditorNavbarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function EditorNavbar({ sidebarOpen, onToggleSidebar }: EditorNavbarProps) {
  return (
    <div className="relative flex h-10 w-full items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="cursor-pointer"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="flex-1" />

      <div className="ml-auto flex items-center justify-center h-10">
        <UserButton />
      </div>
    </div>
  )
}

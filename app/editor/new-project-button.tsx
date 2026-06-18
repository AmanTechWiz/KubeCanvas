"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEditor } from "@/hooks/use-editor-context"

export function NewProjectButton() {
  const { openCreate } = useEditor()

  return (
    <Button onClick={openCreate} className="cursor-pointer">
      <Plus className="h-4 w-4" />
      New Project
    </Button>
  )
}

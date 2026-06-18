"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEditor } from "@/hooks/use-editor-context"

export default function EditorPage() {
  const { openCreate } = useEditor()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-medium text-foreground">
        Create a project or open an existing one?
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Start a new architecture workspace, or choose any current running
        project of yours.
      </p>
      <Button onClick={openCreate} className="cursor-pointer">
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  )
}

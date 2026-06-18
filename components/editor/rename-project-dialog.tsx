"use client"

import { useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RenameProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  formName: string
  loading: boolean
  onNameChange: (name: string) => void
  onSubmit: () => void
}

export function RenameProjectDialog({
  open,
  onOpenChange,
  projectName,
  formName,
  loading,
  onNameChange,
  onSubmit,
}: RenameProjectDialogProps) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const input = document.querySelector(
          '[data-slot="input"]'
        ) as HTMLInputElement
        input?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>Rename Project</DialogTitle>
          <DialogDescription>
            Renaming <span className="text-foreground">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="Project name"
            value={formName}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && formName.trim()) {
                onSubmit()
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading || !formName.trim()}
          >
            {loading ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

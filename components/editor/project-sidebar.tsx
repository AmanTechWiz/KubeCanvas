"use client"

import { Plus, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-1 flex-col overflow-hidden pt-12">
          <div className="flex-1 overflow-hidden p-3">
            <Tabs defaultValue="my-projects" className="flex h-full flex-col">
              <TabsList variant="line" className="w-full justify-start">
                <TabsTrigger value="my-projects">My Projects</TabsTrigger>
                <TabsTrigger value="shared">Shared</TabsTrigger>
              </TabsList>

              <TabsContent value="my-projects" className="mt-4 flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <FolderOpen className="h-8 w-8 text-muted" />
                  <p className="text-sm text-muted">No projects yet</p>
                </div>
              </TabsContent>

              <TabsContent value="shared" className="mt-4 flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <FolderOpen className="h-8 w-8 text-muted" />
                  <p className="text-sm text-muted">No shared projects</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t border-border p-3">
            <Button className="w-full" size="default">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

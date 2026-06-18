"use client"

import {
  Plus,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ProjectData } from "@/lib/project-types"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  myProjects: ProjectData[]
  sharedProjects: ProjectData[]
  currentUserId: string
  onCreateProject: () => void
  onNavigate: (project: ProjectData) => void
  onRenameProject: (project: ProjectData) => void
  onDeleteProject: (project: ProjectData) => void
}

function ProjectItem({
  project,
  isOwner,
  onNavigate,
  onRename,
  onDelete,
}: {
  project: ProjectData
  isOwner: boolean
  onNavigate: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50">
      <div className="flex flex-1 items-center gap-2 cursor-pointer min-w-0" onClick={onNavigate}>
        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-foreground">{project.name}</span>
      </div>
      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100"
              />
            }
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="sr-only">Actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onRename}
              className="focus:bg-muted focus:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={onDelete}
              className="focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export function ProjectSidebar({
  isOpen,
  onClose,
  myProjects,
  sharedProjects,
  currentUserId,
  onCreateProject,
  onNavigate,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-1 flex-col overflow-hidden pt-12">
          <div className="flex-1 overflow-hidden p-3">
            <Tabs defaultValue="my-projects" className="flex h-full flex-col">
              <TabsList variant="line" className="w-full justify-start">
                <TabsTrigger value="my-projects" className="cursor-pointer">My Projects</TabsTrigger>
                <TabsTrigger value="shared" className="cursor-pointer">Shared</TabsTrigger>
              </TabsList>

              <TabsContent
                value="my-projects"
                className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto"
              >
                {myProjects.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <FolderOpen className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No projects yet
                      </p>
                    </div>
                  </div>
                ) : (
                  myProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isOwner={project.ownerId === currentUserId}
                      onNavigate={() => onNavigate(project)}
                      onRename={() => onRenameProject(project)}
                      onDelete={() => onDeleteProject(project)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent
                value="shared"
                className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto"
              >
                {sharedProjects.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <FolderOpen className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No shared projects
                      </p>
                    </div>
                  </div>
                ) : (
                  sharedProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isOwner={false}
                      onNavigate={() => onNavigate(project)}
                      onRename={() => onRenameProject(project)}
                      onDelete={() => onDeleteProject(project)}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t border-border p-3">
            <Button
              className="w-full cursor-pointer"
              size="default"
              onClick={onCreateProject}
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

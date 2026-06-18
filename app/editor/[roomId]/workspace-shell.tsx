"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  PanelLeftOpen,
  PanelLeftClose,
  Share2,
  Sparkles,
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { useProjectActions } from "@/hooks/use-project-actions"
import { EditorContext } from "@/hooks/use-editor-context"
import type { ProjectData, SharedProjectData } from "@/lib/project-types"

interface WorkspaceShellProps {
  projectId: string
  projectName: string
  isOwner: boolean
  currentUserId: string
  ownedProjects: ProjectData[]
  sharedProjects: SharedProjectData[]
}

export function WorkspaceShell({
  projectId,
  projectName,
  isOwner,
  currentUserId,
  ownedProjects,
  sharedProjects,
}: WorkspaceShellProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false)

  const {
    dialog,
    formName,
    formSlug,
    loading,
    selectedProject,
    setFormName,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    createProject,
    renameProject,
    deleteProject,
  } = useProjectActions({
    pathname: `/editor/${projectId}`,
    refresh: () => router.refresh(),
  })

  return (
    <EditorContext.Provider value={{ openCreate }}>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Workspace navbar */}
        <nav className="relative z-[60] flex h-12 items-center border-b border-border bg-card px-3">
          {/* Left: sidebar toggle + project name */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              className="cursor-pointer"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </Button>

            <div className="h-4 w-px bg-border" />

            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
              {projectName}
            </span>
          </div>

          {/* Center spacer */}
          <div className="flex-1" />

          {/* Right: share + AI toggle + user */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
              aria-label={aiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
              className="cursor-pointer text-accent-ai hover:text-accent-ai-text"
            >
              <Sparkles className="h-5 w-5" />
            </Button>

            <div className="ml-1">
              <UserButton />
            </div>
          </div>
        </nav>

        {/* Body: sidebar + canvas + AI sidebar */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Project sidebar */}
          <ProjectSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            myProjects={ownedProjects}
            sharedProjects={sharedProjects}
            currentUserId={currentUserId}
            currentProjectId={projectId}
            onCreateProject={openCreate}
            onNavigate={(project) => {
              window.location.href = `/editor/${project.slug}`
            }}
            onRenameProject={openRename}
            onDeleteProject={openDelete}
          />

          {/* Canvas area — placeholder */}
          <div className="flex flex-1 items-center justify-center bg-base">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Canvas coming soon
              </p>
              <p className="text-xs text-faint">
                React Flow + Liveblocks integration goes here
              </p>
            </div>
          </div>

          {/* AI sidebar placeholder */}
          {aiSidebarOpen && (
            <div className="flex w-80 flex-col border-l border-border bg-card">
              <div className="flex h-10 items-center border-b border-border px-3">
                <Sparkles className="h-4 w-4 text-accent-ai" />
                <span className="ml-2 text-sm font-medium text-foreground">
                  AI Assistant
                </span>
              </div>

              <div className="flex flex-1 items-center justify-center p-4">
                <p className="text-center text-sm text-muted-foreground">
                  AI chat integration coming soon
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Project dialogs */}
        <CreateProjectDialog
          open={dialog === "create"}
          onOpenChange={(open) => {
            if (!open) closeDialog()
          }}
          formName={formName}
          formSlug={formSlug}
          loading={loading}
          onNameChange={setFormName}
          onSubmit={createProject}
        />

        <RenameProjectDialog
          open={dialog === "rename"}
          onOpenChange={(open) => {
            if (!open) closeDialog()
          }}
          projectName={selectedProject?.name ?? ""}
          formName={formName}
          loading={loading}
          onNameChange={setFormName}
          onSubmit={renameProject}
        />

        <DeleteProjectDialog
          open={dialog === "delete"}
          onOpenChange={(open) => {
            if (!open) closeDialog()
          }}
          projectName={selectedProject?.name ?? ""}
          loading={loading}
          onConfirm={deleteProject}
        />
      </div>
    </EditorContext.Provider>
  )
}

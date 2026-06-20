"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import { ShareDialog } from "@/components/editor/share-dialog"
import { ShapePanel } from "@/components/editor/shape-panel"
import { CanvasEditor } from "./canvas-editor"
import type { ProjectData, SharedProjectData } from "@/lib/project-types"

interface WorkspaceShellProps {
  projectId: string
  projectSlug: string
  projectName: string
  isOwner: boolean
  currentUserId: string
  ownedProjects: ProjectData[]
  sharedProjects: SharedProjectData[]
}

export function WorkspaceShell({
  projectId,
  projectSlug,
  projectName,
  isOwner,
  currentUserId,
  ownedProjects,
  sharedProjects,
}: WorkspaceShellProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const accessCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const checkAccessRef = useRef<(() => Promise<void>) | null>(null)

  // Poll access every 5s + on tab focus — reload if revoked
  useEffect(() => {
    let cancelled = false

    const checkAccess = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/access`)
        if (res.ok) {
          const data = await res.json()
          if (!data.hasAccess && !cancelled) {
            window.location.reload()
          }
        }
      } catch {
        // Network error — skip this check cycle
      }
    }

    checkAccessRef.current = checkAccess

    // Poll every 5 seconds
    accessCheckRef.current = setInterval(checkAccess, 5_000)

    // Also check when the tab regains focus
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAccess()
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      if (accessCheckRef.current) clearInterval(accessCheckRef.current)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [projectId])

  // Immediate check when share dialog closes — owner may have just revoked access
  const handleShareOpenChange = useCallback((open: boolean) => {
    setShareOpen(open)
    if (!open && checkAccessRef.current) {
      checkAccessRef.current()
    }
  }, [])

  const {
    dialog,
    formName,
    formSlug,
    loading,
    error,
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
      <div className="relative h-screen overflow-hidden">
        {/* Workspace navbar — floating glass pill over canvas */}
        <div className="absolute top-2 inset-x-2 z-[60]">
          <div className="relative flex h-10 w-full items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.06)]">
            {/* Left: sidebar toggle */}
            <div className="flex items-center shrink-0">
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
            </div>

            {/* Center: project name */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
                {projectName}
              </span>
            </div>

            {/* Right: share + user */}
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShareOpen(true)
                  if (checkAccessRef.current) checkAccessRef.current()
                }}
                className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>

              <div className="ml-1 flex items-center justify-center h-10">
                <UserButton />
              </div>
            </div>
          </div>
        </div>

        {/* Floating AI toggle — above minimap, bottom-right */}
        <div className="absolute bottom-44 right-4 z-[60]">
          <Button
            size="icon-lg"
            variant="ghost"
            onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
            aria-label={aiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
            className={`rounded-full cursor-pointer border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_2px_16px_rgba(0,0,0,0.25),inset_0_0.5px_0_rgba(255,255,255,0.06)] transition-colors ${aiSidebarOpen ? "text-accent-ai bg-accent-ai/10" : "text-muted-foreground hover:text-accent-ai"}`}
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>

        {/* Body: sidebar + canvas + AI sidebar */}
        <div className="relative flex h-full overflow-hidden">
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

          {/* Canvas area */}
          <div className="relative flex flex-1 overflow-hidden bg-base">
            <CanvasEditor roomId={projectId} />
            <ShapePanel />
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
          error={error}
          onConfirm={deleteProject}
        />

        <ShareDialog
          open={shareOpen}
          onOpenChange={handleShareOpenChange}
          projectId={projectId}
          projectSlug={projectSlug}
          projectName={projectName}
          isOwner={isOwner}
        />
      </div>
    </EditorContext.Provider>
  )
}

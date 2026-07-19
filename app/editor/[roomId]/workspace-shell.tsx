"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  PanelLeftOpen,
  PanelLeftClose,
  Share2,
  LayoutTemplate,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { useProjectActions } from "@/hooks/use-project-actions"
import { EditorContext } from "@/hooks/use-editor-context"
import { ShareDialog } from "@/components/editor/share-dialog"
import { ShapeDragPreview } from "@/components/editor/shape-drag-preview"
import { CanvasEditor } from "./canvas-editor"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import type { SaveStatus } from "@/hooks/use-autosave"
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
  const [starterTemplatesOpen, setStarterTemplatesOpen] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<CanvasTemplate | null>(null)
  const [saveApi, setSaveApi] = useState<{ manualSave: () => void; status: SaveStatus } | null>(null)

  // Immediate check when share dialog closes — owner may have just revoked access
  const handleShareOpenChange = useCallback((open: boolean) => {
    setShareOpen(open)
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

            {/* Right: save + templates + share + user */}
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveApi?.manualSave()}
                disabled={!saveApi || saveApi.status === "saving"}
                className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {saveApi?.status === "saving"
                    ? "Saving…"
                    : saveApi?.status === "saved"
                    ? "Saved"
                    : saveApi?.status === "error"
                    ? "Error"
                    : "Save"}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStarterTemplatesOpen(true)}
                className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <LayoutTemplate className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShareOpen(true)}
                className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
          </div>
        </div>



        {/* Floating AI toggle — bottom-right */}
        {!aiSidebarOpen && (
          <div className="absolute bottom-4 right-4 z-[60] group">
            {/* Outer glow pulse ring */}
            <span className="pointer-events-none absolute -inset-3 rounded-full bg-white/[0.04] blur-xl ai-pulse group-hover:bg-white/[0.07]" />
            <button
              onClick={() => setAiSidebarOpen(true)}
              aria-label="Open AI sidebar"
              className="relative flex size-14 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_2px_16px_rgba(0,0,0,0.25),inset_0_0.5px_0_rgba(255,255,255,0.06)] transition-all duration-300 ease-out hover:scale-110 hover:border-white/[0.15] hover:bg-white/[0.08] hover:shadow-[0_4px_28px_rgba(100,87,249,0.18),0_2px_16px_rgba(0,0,0,0.3),inset_0_0.5px_0_rgba(255,255,255,0.1)] active:scale-95"
            >
              <img
                src="/robot.png"
                alt="KubeAI"
                width={28}
                height={28}
                className="block transition-transform duration-300 group-hover:rotate-[8deg] group-hover:scale-105"
              />
            </button>
          </div>
        )}

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
            <CanvasEditor
              roomId={projectId}
              projectId={projectId}
              pendingTemplate={pendingTemplate}
              onTemplateImported={() => setPendingTemplate(null)}
              currentUserId={currentUserId}
              isOwner={isOwner}
              onSaveApi={setSaveApi}
              aiSidebarOpen={aiSidebarOpen}
            />
            <ShapeDragPreview />
          </div>
        </div>

        {/* AI sidebar — placeholder, no LLM calls */}
        <AiSidebar
          isOpen={aiSidebarOpen}
          onClose={() => setAiSidebarOpen(false)}
          projectId={projectId}
          currentUserId={currentUserId}
        />

        {/* Project dialogs */}
        <CreateProjectDialog
          open={dialog === "create"}
          onOpenChange={(open) => {
            if (!open) closeDialog()
          }}
          formName={formName}
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

        <StarterTemplatesModal
          open={starterTemplatesOpen}
          onOpenChange={setStarterTemplatesOpen}
          onImport={(template) => setPendingTemplate(template)}
        />
      </div>
    </EditorContext.Provider>
  )
}

"use client"

import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { useProjectActions } from "@/hooks/use-project-actions"
import { EditorContext } from "@/hooks/use-editor-context"
import type { ProjectData, SharedProjectData } from "@/lib/project-types"

interface EditorLayoutClientProps {
  ownedProjects: ProjectData[]
  sharedProjects: SharedProjectData[]
  currentUserId: string
  children: React.ReactNode
}

export function EditorLayoutClient({
  ownedProjects,
  sharedProjects,
  currentUserId,
  children,
}: EditorLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    pathname,
    refresh: () => router.refresh(),
  })

  // Inside a workspace room — the room page provides its own chrome
  const isWorkspace = /^\/editor\/[^/]+/.test(pathname)

  if (isWorkspace) {
    return (
      <EditorContext.Provider value={{ openCreate }}>
        {children}
      </EditorContext.Provider>
    )
  }

  return (
    <EditorContext.Provider value={{ openCreate }}>
      <div className="relative h-screen overflow-hidden">
        {/* Floating pill navbar over canvas */}
        <div className="absolute top-2 inset-x-2 z-[60]">
          <EditorNavbar
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        <ProjectSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          myProjects={ownedProjects}
          sharedProjects={sharedProjects}
          currentUserId={currentUserId}
          onCreateProject={openCreate}
          onNavigate={(project) => {
            window.location.href = `/editor/${project.slug}`
          }}
          onRenameProject={openRename}
          onDeleteProject={openDelete}
        />

        <main className="flex h-full overflow-hidden">
          {children}
        </main>

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
      </div>
    </EditorContext.Provider>
  )
}

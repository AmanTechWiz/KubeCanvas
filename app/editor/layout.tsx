"use client"

import { useState } from "react"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import { EditorContext } from "@/hooks/use-editor-context"

export default function EditorRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    myProjects,
    sharedProjects,
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
  } = useProjectDialogs()

  return (
    <EditorContext.Provider value={{ openCreate }}>
      <div className="flex h-screen flex-col">
        <EditorNavbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <ProjectSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          myProjects={myProjects}
          sharedProjects={sharedProjects}
          onCreateProject={openCreate}
          onRenameProject={openRename}
          onDeleteProject={openDelete}
        />

        <main className="flex flex-1 overflow-hidden">
          {children}
        </main>

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

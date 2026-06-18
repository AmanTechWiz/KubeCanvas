"use client"

import { useState, useCallback } from "react"
import type { ProjectData } from "@/lib/project-types"
import { generateSlug } from "@/lib/slug"

export type DialogType = "create" | "rename" | "delete" | null

export function useProjectActions({
  pathname,
  refresh,
}: {
  pathname: string
  refresh: () => void
}) {
  const [dialog, setDialog] = useState<DialogType>(null)
  const [formName, setFormName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(
    null,
  )

  const formSlug = generateSlug(formName)

  const openCreate = useCallback(() => {
    setFormName("")
    setError(null)
    setDialog("create")
  }, [])

  const openRename = useCallback((project: ProjectData) => {
    setSelectedProject(project)
    setFormName(project.name)
    setError(null)
    setDialog("rename")
  }, [])

  const openDelete = useCallback((project: ProjectData) => {
    setSelectedProject(project)
    setError(null)
    setDialog("delete")
  }, [])

  const closeDialog = useCallback(() => {
    setDialog(null)
    setFormName("")
    setSelectedProject(null)
    setError(null)
    setLoading(false)
  }, [])

  const createProject = useCallback(async () => {
    if (!formName.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim() }),
      })
      if (!res.ok) throw new Error("Failed to create project")
      const { project } = await res.json()
      setDialog(null)
      setFormName("")
      setLoading(false)
      refresh()
      window.location.href = `/editor/${project.slug}`
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setLoading(false)
    }
  }, [formName, refresh])

  const renameProject = useCallback(async () => {
    if (!formName.trim() || !selectedProject) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim() }),
      })
      if (!res.ok) throw new Error("Failed to rename project")
      const { project: updated } = await res.json()
      const isCurrentWorkspace =
        pathname === `/editor/${selectedProject.slug}` ||
        pathname === `/editor/${selectedProject.id}`
      closeDialog()
      if (isCurrentWorkspace) {
        window.location.href = `/editor/${updated.slug}`
      } else {
        refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setLoading(false)
    }
  }, [formName, selectedProject, pathname, closeDialog, refresh])

  const deleteProject = useCallback(async () => {
    if (!selectedProject) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete project")
      const isCurrentWorkspace =
        pathname === `/editor/${selectedProject.slug}` ||
        pathname === `/editor/${selectedProject.id}`
      closeDialog()
      if (isCurrentWorkspace) {
        window.location.href = "/editor"
      } else {
        refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setLoading(false)
    }
  }, [selectedProject, pathname, closeDialog, refresh])

  return {
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
  }
}

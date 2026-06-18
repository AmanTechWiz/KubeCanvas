"use client"

import { useState, useCallback } from "react"
import {
  MOCK_PROJECTS,
  MOCK_USER_ID,
  generateSlug,
  type Project,
} from "@/lib/mock-projects"

export type DialogType = "create" | "rename" | "delete" | null

export interface ProjectDialogState {
  dialog: DialogType
  formName: string
  formSlug: string
  loading: boolean
  selectedProject: Project | null
}

export function useProjectDialogs() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS)
  const [dialog, setDialog] = useState<DialogType>(null)
  const [formName, setFormName] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const formSlug = generateSlug(formName)

  const openCreate = useCallback(() => {
    setFormName("")
    setDialog("create")
  }, [])

  const openRename = useCallback((project: Project) => {
    setSelectedProject(project)
    setFormName(project.name)
    setDialog("rename")
  }, [])

  const openDelete = useCallback((project: Project) => {
    setSelectedProject(project)
    setDialog("delete")
  }, [])

  const closeDialog = useCallback(() => {
    setDialog(null)
    setFormName("")
    setSelectedProject(null)
    setLoading(false)
  }, [])

  const createProject = useCallback(async () => {
    if (!formName.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 400))
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: formName.trim(),
      slug: generateSlug(formName),
      ownerId: MOCK_USER_ID,
      createdAt: new Date().toISOString().split("T")[0],
    }
    setProjects((prev) => [...prev, newProject])
    setLoading(false)
    closeDialog()
  }, [formName, closeDialog])

  const renameProject = useCallback(async () => {
    if (!formName.trim() || !selectedProject) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 400))
    setProjects((prev) =>
      prev.map((p) =>
        p.id === selectedProject.id
          ? { ...p, name: formName.trim(), slug: generateSlug(formName) }
          : p
      )
    )
    setLoading(false)
    closeDialog()
  }, [formName, selectedProject, closeDialog])

  const deleteProject = useCallback(async () => {
    if (!selectedProject) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 400))
    setProjects((prev) => prev.filter((p) => p.id !== selectedProject.id))
    setLoading(false)
    closeDialog()
  }, [selectedProject, closeDialog])

  const myProjects = projects.filter((p) => p.ownerId === MOCK_USER_ID)
  const sharedProjects = projects.filter((p) => p.ownerId !== MOCK_USER_ID)

  return {
    projects,
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
  }
}

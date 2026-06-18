export interface ProjectData {
  id: string
  name: string
  slug: string
  ownerId: string
  createdAt: string
}

export interface SharedProjectData extends ProjectData {
  sharedBy: string
}

export interface Project {
  id: string
  name: string
  slug: string
  ownerId: string
  createdAt: string
}

export const MOCK_USER_ID = "user_1"

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj_1",
    name: "E-Commerce Platform",
    slug: "e-commerce-platform",
    ownerId: MOCK_USER_ID,
    createdAt: "2026-06-10",
  },
  {
    id: "proj_2",
    name: "Auth Service",
    slug: "auth-service",
    ownerId: MOCK_USER_ID,
    createdAt: "2026-06-12",
  },
  {
    id: "proj_3",
    name: "Design System",
    slug: "design-system",
    ownerId: "user_2",
    createdAt: "2026-06-14",
  },
]

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

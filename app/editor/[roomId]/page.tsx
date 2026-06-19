import { redirect } from "next/navigation"
import {
  checkProjectAccess,
  getCurrentIdentity,
} from "@/lib/project-access"
import { getProjects } from "@/lib/project-data"
import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "./workspace-shell"

interface RoomPageProps {
  params: Promise<{ roomId: string }>
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params

  // Unauthenticated users redirect to sign-in
  const identity = await getCurrentIdentity()
  if (!identity) {
    redirect("/sign-in")
  }

  const access = await checkProjectAccess(roomId)

  if (!access) {
    return <AccessDenied />
  }

  // Fetch all user projects for the sidebar
  const { ownedProjects, sharedProjects } = await getProjects()

  return (
    <WorkspaceShell
      projectId={access.project.id}
      projectSlug={access.project.slug}
      projectName={access.project.name}
      isOwner={access.isOwner}
      currentUserId={identity.userId}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}

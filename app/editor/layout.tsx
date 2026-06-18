import { getProjects } from "@/lib/project-data"
import { EditorLayoutClient } from "./editor-layout-client"

export default async function EditorRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { userId, ownedProjects, sharedProjects } = await getProjects()

  return (
    <EditorLayoutClient
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
      currentUserId={userId}
    >
      {children}
    </EditorLayoutClient>
  )
}

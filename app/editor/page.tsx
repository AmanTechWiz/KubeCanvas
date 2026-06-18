import { getProjects } from "@/lib/project-data"
import { NewProjectButton } from "./new-project-button"

export default async function EditorPage() {
  const { ownedProjects, sharedProjects } = await getProjects()
  const totalProjects = ownedProjects.length + sharedProjects.length

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-medium text-foreground">
        {totalProjects === 0
          ? "Create your first project"
          : "Create a project or open an existing one?"}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {totalProjects === 0
          ? "Start a new architecture workspace to begin designing."
          : "Start a new architecture workspace, or choose any current running project of yours."}
      </p>
      <NewProjectButton />
    </div>
  )
}

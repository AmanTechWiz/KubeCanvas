import Link from "next/link"
import { Lock } from "lucide-react"

export function AccessDenied() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">
          Access denied
        </h1>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have access to this project, or it doesn&apos;t exist.
        </p>
      </div>

      <Link
        href="/editor"
        className="inline-flex h-8 items-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        Back to projects
      </Link>
    </div>
  )
}

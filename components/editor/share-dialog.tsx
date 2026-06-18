"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Check, X, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Collaborator {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: string
}

interface OwnerInfo {
  name: string
  email: string
  avatarUrl: string | null
}

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectSlug: string
  projectName: string
  isOwner: boolean
}

export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  projectSlug,
  projectName,
  isOwner,
}: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [owner, setOwner] = useState<OwnerInfo | null>(null)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const fetchCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`)
      if (res.ok) {
        const data = await res.json()
        setCollaborators(data.collaborators)
        if (data.owner) setOwner(data.owner)
      }
    } catch {
      // Silently fail — dialog still renders
    }
  }, [projectId])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, state set after await
      fetchCollaborators()
      setEmail("")
      setCopied(false)
      setError("")
    }
  }, [open, fetchCollaborators])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })

      if (res.ok) {
        setEmail("")
        await fetchCollaborators()
      } else {
        const data = await res.json()
        setError(data.error ?? "Failed to add collaborator")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (collaboratorId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collaboratorId }),
      })

      if (res.ok) {
        await fetchCollaborators()
      }
    } catch {
      // Silently fail
    }
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/editor/${projectSlug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Share &ldquo;{projectName}&rdquo;
          </DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Invite collaborators or share a link to this project."
              : "View who has access to this project."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invite form — owners only */}
          {isOwner && (
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  placeholder="Add by email..."
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                />
                {email && (
                  <button
                    type="button"
                    onClick={() => setEmail("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={!email.trim() || loading}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {loading ? "Adding..." : "Invite"}
              </Button>
            </form>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Owner — shown for collaborators */}
          {!isOwner && owner && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Owner
              </p>
              <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-2 py-1.5">
                {owner.avatarUrl ? (
                  <img
                    src={owner.avatarUrl}
                    alt={owner.name}
                    className="h-7 w-7 rounded-full"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {owner.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {owner.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {owner.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Collaborator list */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {isOwner ? "Collaborators" : "All collaborators"}
            </p>

            {collaborators.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                No collaborators yet.
              </p>
            ) : (
              <div className="max-h-48 space-y-0.5 overflow-y-auto">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                  >
                    {collab.avatarUrl ? (
                      <img
                        src={collab.avatarUrl}
                        alt={collab.name}
                        className="h-7 w-7 rounded-full"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {collab.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {collab.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {collab.email}
                      </p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemove(collab.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-state-success" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

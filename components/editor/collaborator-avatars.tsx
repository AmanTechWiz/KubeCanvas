"use client"

import { useOthers, useSelf } from "@liveblocks/react"
import { UserButton } from "@clerk/nextjs"
import { getUserColor } from "@/lib/liveblocks"

const MAX_VISIBLE = 5

/**
 * Renders the collaborator avatar group in the top-right of the editor canvas.
 * - Shows other room participants as an overlapping avatar stack.
 * - Shows the current user via Clerk UserButton.
 * - Divider appears only when at least one collaborator is present.
 */
export function CollaboratorAvatars() {
  const others = useOthers()
  const self = useSelf()

  const othersList = (self
    ? others.filter((o) => o.id !== self.id)
    : others
  // Deduplicate: useOthers returns one entry per *connection*, so
  // the same user with multiple tabs produces duplicate entries.
  ).filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i)

  const visible = othersList.slice(0, MAX_VISIBLE)
  const overflow = othersList.length - MAX_VISIBLE

  return (
    <div className="flex items-center gap-1.5">
      {/* Collaborator avatars */}
      {visible.length > 0 && (
        <div className="flex items-center -space-x-2">
          {visible.map((other) => {
            const info = other.info
            const color = info?.color ?? getUserColor(other.id)
            const name = info?.name ?? "Anonymous"
            const avatar = info?.avatar ?? ""

            const initials = name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()

            return (
              <div
                key={other.id}
                className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-black/50"
                style={{ backgroundColor: color }}
                title={name}
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-semibold leading-none text-white">
                    {initials}
                  </span>
                )}
              </div>
            )
          })}

          {overflow > 0 && (
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 ring-2 ring-black/50">
              <span className="text-[10px] font-medium text-white">
                +{overflow}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Divider — only when collaborators exist */}
      {othersList.length > 0 && (
        <div className="mx-0.5 h-5 w-px bg-white/[0.15]" />
      )}

      {/* Current user via Clerk */}
      <div className="flex h-7 w-7 items-center justify-center">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-7 w-7",
            },
          }}
        />
      </div>
    </div>
  )
}

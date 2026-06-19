import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getLiveblocks, getUserColor } from "@/lib/liveblocks";
import { checkProjectAccess } from "@/lib/project-access";

/**
 * POST /api/liveblocks-auth
 *
 * Authenticates a user for a Liveblocks room.
 * The room ID is the project ID (or slug).
 * Verifies Clerk authentication + project access before issuing a token.
 */
export async function POST(request: Request) {
  const identity = await currentUser();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const roomId: string | undefined = body.room;

  if (!roomId) {
    return NextResponse.json({ error: "Missing room" }, { status: 400 });
  }

  // Verify project access (owner or collaborator)
  const access = await checkProjectAccess(roomId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name =
    identity.fullName ?? identity.username ?? identity.emailAddresses[0]?.emailAddress ?? "Anonymous";
  const avatar =
    identity.imageUrl ?? "";

  const color = getUserColor(access.userId);

  const lb = getLiveblocks();

  // Ensure the Liveblocks room exists (create only if needed)
  await lb.getOrCreateRoom(roomId, {
    defaultAccesses: [], // Private room — access is managed via ID tokens
  });

  // Prepare a session and grant read+write access to this room
  const session = lb.prepareSession(access.userId, {
    userInfo: {
      name,
      avatar,
      color,
    },
  });
  session.allow(roomId, ["*:write"]);

  // Authorize and return the access token
  const { body: tokenBody, status } = await session.authorize();

  return new NextResponse(tokenBody, { status });
}

import { NextResponse } from "next/server";
import { checkProjectAccess } from "@/lib/project-access";

/**
 * GET — Lightweight access check. Returns whether the current user
 * still has access to this project. Used by WorkspaceShell polling
 * to immediately revoke access when a collaborator is removed.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const access = await checkProjectAccess(projectId);

  if (!access) {
    return NextResponse.json({ hasAccess: false }, { status: 200 });
  }

  return NextResponse.json({ hasAccess: true });
}

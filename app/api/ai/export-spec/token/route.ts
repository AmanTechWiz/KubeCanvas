import { NextResponse } from "next/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

/**
 * POST — Issue a Trigger.dev public token scoped to a specific spec export run.
 *
 * Accepts: { runId: string }
 * Verifies ownership via TaskRun, then returns a time-limited public token.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { runId } = body;

  if (typeof runId !== "string" || runId.trim() === "") {
    return NextResponse.json(
      { error: "runId is required" },
      { status: 400 }
    );
  }

  // Verify ownership — the task run must belong to the requesting user
  const taskRun = await prisma.taskRun.findUnique({
    where: { runId },
    select: { userId: true, projectId: true },
  });

  if (!taskRun) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Allow owner or collaborator with project access
  const access = await checkProjectAccess(taskRun.projectId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Issue a public token scoped to this specific run
  const publicToken = await triggerAuth.createPublicToken({
    scopes: {
      read: {
        runs: [runId],
      },
    },
    expirationTime: "1h",
  });

  return NextResponse.json({ token: publicToken });
}

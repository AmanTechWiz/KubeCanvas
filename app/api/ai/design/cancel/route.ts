import { NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk";
import { Liveblocks } from "@liveblocks/node";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

/**
 * POST — Cancel a running design generation task.
 *
 * Accepts: { triggerDevRunId: string }
 * Cancels the Trigger.dev run and returns success.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { triggerDevRunId } = body;

  if (typeof triggerDevRunId !== "string" || triggerDevRunId.trim() === "") {
    return NextResponse.json(
      { error: "triggerDevRunId is required" },
      { status: 400 },
    );
  }

  // Verify ownership via TaskRun record
  const taskRun = await prisma.taskRun.findUnique({
    where: { runId: triggerDevRunId },
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

  try {
    // Cancel the run FIRST so the agent stops processing
    await runs.cancel(triggerDevRunId);

    // Then clear the cursor — the try/finally in the agent task
    // will also handle this, but we clear here as a belt-and-suspenders
    // measure in case the agent is mid-mutation when cancellation arrives.
    await liveblocks.mutateStorage(taskRun.projectId, async ({ root }) => {
      root.set("agentThinking", false);
      root.set("agentCursor", null);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Run may already be completed or not found — treat as success
    return NextResponse.json({ ok: true });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runs } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";

/**
 * POST — Cancel a running design generation task.
 *
 * Accepts: { triggerDevRunId: string }
 * Cancels the Trigger.dev run and returns success.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    select: { userId: true },
  });

  if (!taskRun) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (taskRun.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await runs.cancel(triggerDevRunId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Run may already be completed or not found — treat as success
    return NextResponse.json({ ok: true });
  }
}

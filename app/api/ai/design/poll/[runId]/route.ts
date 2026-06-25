import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runs } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";

/**
 * GET — Poll the status of a design run.
 *
 * Returns { status: string } for the given run ID.
 * Used as a fallback when the realtime subscription misses completion.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  // Verify ownership
  const taskRun = await prisma.taskRun.findUnique({
    where: { runId },
    select: { userId: true },
  });

  if (!taskRun || taskRun.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const run = await runs.retrieve(runId);
    return NextResponse.json({ status: run.status });
  } catch {
    return NextResponse.json({ status: "UNKNOWN" });
  }
}

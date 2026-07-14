import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * GET — Load chat history for a project + user.
 * Query params: ?projectId=xxx
 * Returns the last 100 messages ordered by creation time.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  const messages = await prisma.chatMessage.findMany({
    where: { projectId, userId },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      role: true,
      content: true,
      parts: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ messages });
}

/**
 * POST — Save a chat message.
 * Body: { projectId, role, content, parts? }
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, projectId, role, content, parts } = body;

  if (!projectId || !role || !content) {
    return NextResponse.json(
      { error: "projectId, role, and content are required" },
      { status: 400 },
    );
  }

  if (!["user", "assistant"].includes(role)) {
    return NextResponse.json(
      { error: "role must be 'user' or 'assistant'" },
      { status: 400 },
    );
  }

  const message = await prisma.chatMessage.create({
    data: {
      id: id || undefined,
      projectId,
      userId,
      role,
      content,
      parts: parts ?? undefined,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}

/**
 * PATCH — Update an existing chat message (e.g. tool output status/runId).
 * Body: { projectId, messageId, parts }
 */
export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, messageId, parts } = body;

  if (!projectId || !messageId || !parts) {
    return NextResponse.json(
      { error: "projectId, messageId, and parts are required" },
      { status: 400 },
    );
  }

  const existingMessage = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!existingMessage) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Ensure message belongs to the current user and project
  if (
    existingMessage.userId !== userId ||
    existingMessage.projectId !== projectId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedMessage = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      parts: parts,
    },
  });

  return NextResponse.json({ message: updatedMessage });
}

/**
 * DELETE — Clear all chat messages for a project + user.
 * Body: { projectId }
 */
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  const { count } = await prisma.chatMessage.deleteMany({
    where: { projectId, userId },
  });

  return NextResponse.json({ deleted: count });
}

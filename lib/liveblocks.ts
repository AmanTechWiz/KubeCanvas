import { Liveblocks } from "@liveblocks/node";

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined;
};

/**
 * Cached Liveblocks Node client.
 * Lazily initialized on first access to avoid build-time errors
 * when the secret key env var is not yet available.
 */
export function getLiveblocks(): Liveblocks {
  if (globalForLiveblocks.liveblocks) return globalForLiveblocks.liveblocks;

  const client = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForLiveblocks.liveblocks = client;
  }

  return client;
}

/**
 * Fixed palette of cursor colors.
 * Each user is deterministically mapped to a color based on their ID.
 */
const CURSOR_COLORS = [
  "#FF6B6B", // red
  "#4ECDC4", // teal
  "#45B7D1", // sky blue
  "#96CEB4", // sage
  "#FFEAA7", // yellow
  "#DDA0DD", // plum
  "#98D8C8", // mint
  "#F7DC6F", // gold
  "#BB8FCE", // lavender
  "#85C1E9", // light blue
  "#F0B27A", // peach
  "#82E0AA", // green
  "#F1948A", // salmon
  "#85929E", // gray-blue
  "#73C6B6", // seafoam
  "#F8C471", // apricot
] as const;

/**
 * Deterministically maps a user ID to a consistent color from the palette.
 */
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

import { z } from "zod";

// ── AI Status Feed Schemas ──────────────────────────────────────────
// Used by the ai-status-feed for shared AI activity indicators.
// These schemas validate incoming feed messages before display.

/** Supported AI status values. */
export const AiStatusSchema = z.enum([
  "thinking",
  "analyzing",
  "generating",
  "complete",
  "failed",
  "idle",
]);
export type AiStatus = z.infer<typeof AiStatusSchema>;

/** Feed message data for the ai-status-feed. */
export const AiStatusFeedMessageDataSchema = z.object({
  kind: z.literal("status"),
  status: AiStatusSchema,
  text: z.string().optional(),
});
export type AiStatusFeedMessageData = z.infer<typeof AiStatusFeedMessageDataSchema>;

// ── AI Chat Feed Schemas ────────────────────────────────────────────
// Used by the ai-chat feed for collaborative sidebar chat.
// Messages are validated before rendering.

/** Chat message role — only user messages are supported for now. */
export const AiChatRoleSchema = z.enum(["user", "assistant"]);
export type AiChatRole = z.infer<typeof AiChatRoleSchema>;

/** Feed message data for the ai-chat feed. */
export const AiChatFeedMessageDataSchema = z.object({
  kind: z.literal("chat"),
  id: z.string(),
  sender: z.string(),
  role: AiChatRoleSchema,
  content: z.string(),
  timestamp: z.number(),
});
export type AiChatFeedMessageData = z.infer<typeof AiChatFeedMessageDataSchema>;

/** Feed metadata for the ai-status-feed. */
export const AiFeedMetadataSchema = z.object({
  name: z.string().optional(),
});
export type AiFeedMetadata = z.infer<typeof AiFeedMetadataSchema>;

/** Well-known feed ID for AI activity status messages. */
export const AI_STATUS_FEED_ID = "ai-status-feed";

/** Well-known feed ID for collaborative sidebar chat messages. */
export const AI_CHAT_FEED_ID = "ai-chat";

/**
 * Validate a raw feed message payload as a status feed message.
 * Returns parsed data on success, null on failure.
 */
export function validateAiStatusFeedMessage(
  data: unknown,
): AiStatusFeedMessageData | null {
  const result = AiStatusFeedMessageDataSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validate a raw feed message payload as a chat feed message.
 * Returns parsed data on success, null on failure.
 */
export function validateAiChatFeedMessage(
  data: unknown,
): AiChatFeedMessageData | null {
  const result = AiChatFeedMessageDataSchema.safeParse(data);
  return result.success ? result.data : null;
}

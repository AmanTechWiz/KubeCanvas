import type { LiveblocksFlow } from "@liveblocks/react-flow";
import type { CanvasNode, CanvasEdge } from "@/types/canvas";

// Define Liveblocks types for your application
// Lemme attach docs for future ref..
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Real-time cursor coordinates
      cursor: { x: number; y: number } | null;
      // Whether the user is in an AI-thinking state
      isThinking: boolean;
      // AI agent cursor position (canvas coordinates) — separate from
      // user cursor so the agent can move independently on the canvas.
      agentCursor: { x: number; y: number } | null;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      // Liveblocks-backed React Flow canvas
      flow: LiveblocksFlow<CanvasNode, CanvasEdge>;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: {};

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {};

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: {};

    // Feed metadata type for useFeeds
    FeedMetadata: {
      name?: string;
    };

    // Feed message data type for useFeedMessages
    // Discriminated union: "status" for AI activity, "chat" for sidebar chat
    FeedMessageData:
      | { kind: "status"; status: "thinking" | "analyzing" | "generating" | "complete" | "failed" | "idle"; text?: string }
      | { kind: "chat"; id: string; sender: string; role: "user" | "assistant"; content: string; timestamp: number };
  }
}

export {};

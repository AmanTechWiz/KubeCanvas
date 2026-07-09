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
      // AI agent cursor position (set via Liveblocks REST API)
      agentCursor: { x: number; y: number } | null;
      // Whether the AI agent is currently thinking/generating
      isThinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      // Liveblocks-backed React Flow canvas
      flow: LiveblocksFlow<CanvasNode, CanvasEdge>;
      // AI agent cursor position (set by the backend design agent)
      agentCursor: {
        x: number;
        y: number;
      } | null;
      // Whether the AI agent is currently thinking/generating
      agentThinking: boolean;
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
  }
}

export {};

"use client"

import React, {
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react"

import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
  useMutation,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
  useUpdateMyPresence,
  useOthers,
  useSelf,
  useCreateFeed,
  useFeeds,
  useFeedMessages,
  useCreateFeedMessage,
} from "@liveblocks/react"

import { useLiveblocksFlow } from "@liveblocks/react-flow"

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  useReactFlow,
} from "@xyflow/react"
import { LiveObject, LiveMap } from "@liveblocks/client"
import "@xyflow/react/dist/style.css"
import { CanvasNodeComponentMemo } from "@/components/editor/canvas-node"
import { CanvasEdgeComponent } from "@/components/editor/canvas-edge"
import {
  ShapePanelContext,
  ShapePanel,
  type AddNodePayload,
} from "@/components/editor/shape-panel"
import {
  LogoPicker,
  type LogoAddPayload,
} from "@/components/editor/logo-picker"
import { CanvasControls } from "@/components/editor/canvas-controls"
import { CollaboratorAvatars } from "@/components/editor/collaborator-avatars"
import { LiveCursors } from "@/components/editor/live-cursors"
import { AgentCursor } from "@/components/editor/agent-cursor"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { useAutosave, type SaveStatus } from "@/hooks/use-autosave"
import { DEFAULT_NODE_COLOR, NODE_COLORS } from "@/types/canvas"
import { parseShapeDrag, SHAPES } from "@/lib/canvas-shapes"
import { parseLogoDragToCanvas } from "@/lib/logo-data"
import {
  AI_STATUS_FEED_ID,
  AI_CHAT_FEED_ID,
  AI_ARCHITECT_FEED_ID,
  validateAiStatusFeedMessage,
  validateAiChatFeedMessage,
  type AiStatusFeedMessageData,
  type AiChatFeedMessageData,
} from "@/types/tasks"
import type { CanvasTemplate } from "@/components/editor/starter-templates"

// ── React Flow defaults ────────────────────────────────────────────────
const defaultViewport = { x: 0, y: 0, zoom: 1 }

// ── Custom node types ──────────────────────────────────────────────────
const nodeTypes = {
  canvasNode: CanvasNodeComponentMemo,
}

// ── Custom edge types ──────────────────────────────────────────────────
const edgeTypes = {
  canvasEdge: CanvasEdgeComponent,
}

// ── Feed contexts (must be inside RoomProvider) ─────────────────────
// Provides sendFeedMessage + sendChatMessage to AiSidebar and child tabs
// so they can broadcast updates without calling Liveblocks feed hooks directly.
// The two feeds (status + chat) are separate Liveblocks feeds but share
// a single provider for convenience.

interface FeedContextValue {
  sendFeedMessage: (data: AiStatusFeedMessageData) => void
  latestFeedMsg: AiStatusFeedMessageData | null
  isAiActive: boolean
  statusLabel: string | null
  sendChatMessage: (data: AiChatFeedMessageData) => void
  chatMessages: AiChatFeedMessageData[]
  sendArchitectMessage: (data: AiChatFeedMessageData) => void
  architectMessages: AiChatFeedMessageData[]
  currentUserName: string
}

export const FeedContext = React.createContext<FeedContextValue | null>(null)

function FeedProvider({ children }: { children: React.ReactNode }) {
  const createFeed = useCreateFeed()
  const createFeedMessage = useCreateFeedMessage()
  const { feeds } = useFeeds()
  const self = useSelf()

  const currentUserName = self?.info?.name ?? "You"

  // ── Status feed ───────────────────────────────────────────────────
  useEffect(() => {
    createFeed(AI_STATUS_FEED_ID, { metadata: { name: "AI Status" } }).catch(
      () => {}, // Ignore "feed already exists" errors
    )
  }, [createFeed])

  const { messages: statusFeedMessages } = useFeedMessages(AI_STATUS_FEED_ID)

  const latestFeedMsg = useMemo(() => {
    if (!statusFeedMessages || statusFeedMessages.length === 0) return null
    return validateAiStatusFeedMessage(statusFeedMessages[0].data)
  }, [statusFeedMessages])

  // Only use feed status for AI activity — do NOT include useOthers/
  // anyOtherThinking here because the AI agent sets presence via the
  // Liveblocks REST API and clearance can lag behind the feed update,
  // keeping the "thinking" indicator visible after completion.
  const isAiActive =
    latestFeedMsg?.status === "thinking" ||
    latestFeedMsg?.status === "analyzing" ||
    latestFeedMsg?.status === "generating"

  const statusLabel = useMemo(() => {
    if (!latestFeedMsg) return null
    switch (latestFeedMsg.status) {
      case "thinking":
        return "Thinking…"
      case "analyzing":
        return "Analyzing…"
      case "generating":
        return "Generating…"
      case "complete":
        return "Complete"
      case "failed":
        return "Failed"
      default:
        return null
    }
  }, [latestFeedMsg])

  const sendFeedMessage = useCallback(
    (data: AiStatusFeedMessageData) => {
      createFeedMessage(AI_STATUS_FEED_ID, data)
    },
    [createFeedMessage],
  )

  // ── Chat feed ─────────────────────────────────────────────────────
  useEffect(() => {
    createFeed(AI_CHAT_FEED_ID, { metadata: { name: "AI Chat" } }).catch(
      () => {}, // Ignore "feed already exists" errors
    )
  }, [createFeed])

  const { messages: chatFeedMessages } = useFeedMessages(AI_CHAT_FEED_ID)

  const chatMessages = useMemo(() => {
    if (!chatFeedMessages) return []
    return chatFeedMessages
      .map((m) => validateAiChatFeedMessage(m.data))
      .filter((m): m is AiChatFeedMessageData => m !== null)
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [chatFeedMessages])

  const sendChatMessage = useCallback(
    (data: AiChatFeedMessageData) => {
      createFeedMessage(AI_CHAT_FEED_ID, data)
    },
    [createFeedMessage],
  )

  // ── Architect feed (separate from chat) ──────────────────────────
  useEffect(() => {
    createFeed(AI_ARCHITECT_FEED_ID, { metadata: { name: "AI Architect" } }).catch(
      () => {},
    )
  }, [createFeed])

  const { messages: architectFeedMessages } = useFeedMessages(AI_ARCHITECT_FEED_ID)

  const architectMessages = useMemo(() => {
    if (!architectFeedMessages) return []
    return architectFeedMessages
      .map((m) => validateAiChatFeedMessage(m.data))
      .filter((m): m is AiChatFeedMessageData => m !== null)
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [architectFeedMessages])

  const sendArchitectMessage = useCallback(
    (data: AiChatFeedMessageData) => {
      createFeedMessage(AI_ARCHITECT_FEED_ID, data)
    },
    [createFeedMessage],
  )

  return (
    <FeedContext.Provider
      value={{
        sendFeedMessage,
        latestFeedMsg,
        isAiActive,
        statusLabel,
        sendChatMessage,
        chatMessages,
        sendArchitectMessage,
        architectMessages,
        currentUserName,
      }}
    >
      {children}
    </FeedContext.Provider>
  )
}

// ── Default edge options ───────────────────────────────────────────────
const defaultEdgeOptions = {
  type: "canvasEdge",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "rgba(255,255,255,0.45)",
    width: 20,
    height: 20,
  },
  style: {
    stroke: "rgba(255,255,255,0.25)",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
  },
}

// ── ID generator ───────────────────────────────────────────────────────
let nodeCounter = 0
function generateNodeId(shape: string): string {
  return `${shape}-${Date.now()}-${nodeCounter++}`
}

// ── Convert screen coordinates → flow coordinates ───────────────────
// ReactFlow stores its viewport transform as an inline style on
// .react-flow__viewport: "translate(Xpx, Ypx) scale(Z)".
// We read it directly to avoid needing a ReactFlowProvider / useReactFlow.
function screenToFlowPosition(clientX: number, clientY: number): { x: number; y: number } {
  const rfEl = document.querySelector(".react-flow")
  const viewportEl = document.querySelector(".react-flow__viewport") as HTMLElement | null
  if (!rfEl || !viewportEl) return { x: clientX, y: clientY }

  const rfRect = rfEl.getBoundingClientRect()
  // Prefer inline style transform (ReactFlow sets this), but fall back
  // to the computed style which may return a `matrix(...)` string.
  const transform =
    viewportEl.style.transform || window.getComputedStyle(viewportEl).transform || ""
  let tx = 0
  let ty = 0
  let zoom = 1

  // ReactFlow sets: translate(Xpx, Ypx) scale(Z)
  const m = transform.match(
    /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/,
  )
  if (m) {
    tx = parseFloat(m[1])
    ty = parseFloat(m[2])
    zoom = parseFloat(m[3])
  } else {
    // Fallback: matrix(a, b, c, d, tx, ty)
    const mx = transform.match(
      /matrix\(([-\d.e]+),\s*[-\d.e]+,\s*[-\d.e]+,\s*[-\d.e]+,\s*([-\d.e]+),\s*([-\d.e]+)\)/,
    )
    if (mx) {
      zoom = parseFloat(mx[1])
      tx = parseFloat(mx[2])
      ty = parseFloat(mx[3])
    }
  }

  return {
    x: (clientX - rfRect.left - tx) / zoom,
    y: (clientY - rfRect.top - ty) / zoom,
  }
}

// ── Inner canvas that runs inside the Room ────────────────────────────
//
// Drop handlers live on a wrapper div OUTSIDE <ReactFlow>.
// Coordinate conversion reads the viewport transform from the DOM.
function FlowCanvas({
  projectId,
  pendingTemplate,
  onTemplateImported,
  currentUserId,
  aiSidebarOpen,
  onAiSidebarClose,
  onSaveApi,
}: {
  projectId: string
  pendingTemplate?: CanvasTemplate | null
  onTemplateImported?: () => void
  currentUserId: string
  aiSidebarOpen?: boolean
  onAiSidebarClose?: () => void
  onSaveApi?: (api: { manualSave: () => void; status: SaveStatus }) => void
}) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow({ suspense: true })

  // ── Cursor presence ───────────────────────────────────────────────
  const updateMyPresence = useUpdateMyPresence()
  const cursorThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })

  // Track viewport changes from React Flow pan/zoom
  const handleMove = useCallback(
    (_: any, vp: { x: number; y: number; zoom: number }) => {
      setViewport(vp)
    },
    [],
  )

  // Broadcast cursor position via a document-level listener so it
  // keeps working even during node drag (React Flow uses pointer
  // capture internally which can swallow events on the container).
  // We listen to both mousemove and pointermove — pointermove is the
  // only event that fires during setPointerCapture().
  useEffect(() => {
    const rfEl = document.querySelector(".react-flow") as HTMLElement | null
    if (!rfEl) return

    const onCursorMove = (e: MouseEvent | PointerEvent) => {
      if (cursorThrottleRef.current) return
      cursorThrottleRef.current = setTimeout(() => {
        cursorThrottleRef.current = null
      }, 50)

      const rect = rfEl.getBoundingClientRect()

      // Only broadcast when the pointer is within the canvas area
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return
      }

      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top

      // Convert screen → flow coordinates using the viewport transform
      const flowX = (screenX - viewport.x) / viewport.zoom
      const flowY = (screenY - viewport.y) / viewport.zoom

      updateMyPresence({ cursor: { x: flowX, y: flowY } })
    }

    const onMouseLeave = () => {
      updateMyPresence({ cursor: null })
    }

    // Attach to document so cursor presence updates even when React
    // Flow has captured the pointer during a node drag operation.
    document.addEventListener("mousemove", onCursorMove)
    document.addEventListener("pointermove", onCursorMove)
    document.addEventListener("mouseleave", onMouseLeave)

    return () => {
      document.removeEventListener("mousemove", onCursorMove)
      document.removeEventListener("pointermove", onCursorMove)
      document.removeEventListener("mouseleave", onMouseLeave)
    }
  }, [updateMyPresence, viewport])

  // Filter out malformed nodes that lack a valid position object
  const safeNodes = useMemo(
    () =>
      (nodes ?? []).filter(
        (n) => n.position !== undefined && n.position !== null && typeof n.position === "object",
      ),
    [nodes],
  )

  // One-shot cleanup: remove any broken nodes from Liveblocks storage
  const cleanupRan = useRef(false)
  const cleanupMutation = useMutation(({ storage }) => {
    const flow = storage.get("flow")
    if (!flow) return
    const nodesMap = flow.get("nodes")
    const toRemove: string[] = []
    nodesMap.forEach((node, key) => {
      const pos = node.get("position")
      if (pos === undefined || pos === null || typeof pos !== "object") {
        toRemove.push(key)
        return
      }

      // Ensure nodes have width/height set. Older nodes created before
      // we stored dims may be invisible; populate from SHAPES based on
      // the stored `data.shape` value so React Flow can render them.
      const width = node.get("width")
      const height = node.get("height")
      if ((width === undefined || width === null) || (height === undefined || height === null)) {
        try {
          const data = node.get("data")
          const shape = data && typeof (data as any).get === "function" ? (data as any).get("shape") : (data as any).shape
          const def = SHAPES.find((s) => s.shape === shape)
          if (def) {
            node.set("width", def.w)
            node.set("height", def.h)

            // If nested node data exists, ensure it has a readable label
            // and a visible color so legacy nodes aren't invisible on the
            // dark canvas background.
            try {
              const data = node.get("data")
              if (data) {
                const getField = (k: string) =>
                  typeof (data as any).get === "function" ? (data as any).get(k) : (data as any)[k]
                const setField = (k: string, v: any) => {
                  if (typeof (data as any).set === "function") {
                    ;(data as any).set(k, v)
                  } else {
                    // Fallback: replace the data object if it's not a LiveObject
                    node.set("data", new LiveObject({ ...(data as any), [k]: v }))
                  }
                }

                const labelVal = getField("label")
                if (!labelVal && def) {
                  setField("label", def.label)
                }

                const colorVal = getField("color")
                if (!colorVal) {
                  setField("color", "#6457f9")
                }

                // Populate missing textColor from NODE_COLORS lookup
                const textColorVal = getField("textColor")
                if (!textColorVal) {
                  const bgColor = getField("color") || "#6457f9"
                  const match = NODE_COLORS.find(
                    (nc) => nc.bg.toLowerCase() === String(bgColor).toLowerCase(),
                  )
                  setField("textColor", match ? match.text : "#EDEDED")
                }
              }
            } catch (err) {
              // ignore
            }
          }
        } catch (err) {
          // ignore
        }
      }
    })
    for (const key of toRemove) {
      nodesMap.delete(key)
    }
  }, [])

  useEffect(() => {
    if (!cleanupRan.current) {
      cleanupRan.current = true
      cleanupMutation()
    }
  }, [cleanupMutation])

  // ── Node creation mutation ────────────────────────────────────────
  const addNodeMutation = useMutation(
    ({ storage }, payload: AddNodePayload) => {
        try {
          const { shape, w, h, flowX, flowY, logo, logoCustomSvg, label: presetLabel } = payload
          const x = flowX - w / 2
          const y = flowY - h / 2
          const id = generateNodeId(shape)
          const nodesMap = storage.get("flow").get("nodes")

          console.log("[FlowCanvas] addNodeMutation payload:", payload)
          let before = 0
          nodesMap.forEach(() => before++)

          // Default to Neutral color (first in the color picker)
          const defaultColor = NODE_COLORS[0]

          nodesMap.set(
            id,
            new LiveObject({
              id,
              type: "canvasNode",
              position: { x, y },
              // React Flow expects node dimensions to be available so the
              // DOM container can size correctly. Store width/height here.
              width: w,
              height: h,
              data: new LiveObject({
                label: presetLabel ?? "",
                color: defaultColor.bg,
                textColor: defaultColor.text,
                shape,
                ...(logo ? { logo } : {}),
                ...(logoCustomSvg ? { logoCustomSvg } : {}),
              }),
              selected: false,
              dragging: false,
            }) as never,
          )

          let after = 0
          nodesMap.forEach(() => after++)
          console.log("[FlowCanvas] addNodeMutation set id:", id, "pos:", x, y, "nodes before:", before, "after:", after)
        } catch (err) {
          console.error("[FlowCanvas] addNodeMutation error:", err)
        }
    },
    [],
  )

    // Clear all nodes and edges from the canvas
    const clearNodesMutation = useMutation(({ storage }) => {
      try {
        const flow = storage.get("flow")
        if (!flow) return
        const nodesMap = flow.get("nodes")
        const toDelete: string[] = []
        nodesMap.forEach((_n, k) => toDelete.push(k))
        for (const k of toDelete) nodesMap.delete(k)

        const edgesMap = flow.get("edges")
        const edgesToDelete: string[] = []
        edgesMap.forEach((_e, k) => edgesToDelete.push(k))
        for (const k of edgesToDelete) edgesMap.delete(k)
      } catch (err) {
        console.error("[FlowCanvas] clearNodesMutation error:", err)
      }
    }, [])

  const handleAddNode = useCallback(
    (payload: AddNodePayload) => {
      addNodeMutation(payload)
    },
    [addNodeMutation],
  )

  // ── Logo picker state ────────────────────────────────────────
  const [logoPickerOpen, setLogoPickerOpen] = useState(false)

  const handleAddLogo = useCallback(
    (payload: LogoAddPayload) => {
      addNodeMutation({
        shape: "rectangle",
        w: 120,
        h: 80,
        flowX: payload.flowX,
        flowY: payload.flowY,
        logo: payload.icon,
        logoCustomSvg: payload.customSvg,
        label: payload.label,
      })
    },
    [addNodeMutation],
  )

  // ── Autosave ──────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const { manualSave, status } = useAutosave({
    nodes: nodes ?? [],
    edges: edges ?? [],
    projectId,
    onStatusChange: setSaveStatus,
  })

  // Expose save API to parent
  const onSaveApiRef = useRef(onSaveApi)
  onSaveApiRef.current = onSaveApi
  useEffect(() => {
    onSaveApiRef.current?.({ manualSave, status })
  }, [manualSave, status])

  // ── Canvas state loader ──────────────────────────────────────────
  const [canvasLoaded, setCanvasLoaded] = useState(false)

  // ── External drag-drop handlers on wrapper div ────────────────────
  // ReactFlow v12 uses pointer events internally and does not consume
  // native drag/drop events, so they bubble up to this wrapper div.
  const handleDragOver = useCallback((e: DragEvent) => {
    try {
      const types = Array.from(e.dataTransfer.types || [])
      console.log("[FlowCanvas] dragover types:", types)
      if (types.includes("application/x-kubecanvas-shape") || types.includes("application/x-kubecanvas-logo")) {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
      }
    } catch (err) {
      // Defensive: some browsers have restricted dataTransfer access
    }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      try {
        const types = Array.from(e.dataTransfer.types || [])
        console.log("[FlowCanvas] drop types:", types, "client:", e.clientX, e.clientY)

        // Check for logo drop first
        const logoRaw = e.dataTransfer.getData("application/x-kubecanvas-logo")
        if (logoRaw) {
          const logoPayload = parseLogoDragToCanvas(logoRaw)
          if (logoPayload) {
            e.preventDefault()
            e.stopPropagation()
            const position = screenToFlowPosition(e.clientX, e.clientY)
            addNodeMutation({
              shape: "rectangle",
              w: logoPayload.w,
              h: logoPayload.h,
              flowX: position.x,
              flowY: position.y,
              logo: logoPayload.icon,
              logoCustomSvg: logoPayload.customSvg,
              label: logoPayload.label,
            })
            return
          }
        }

        // Fall back to shape drop
        const raw = e.dataTransfer.getData("application/x-kubecanvas-shape")
        console.log("[FlowCanvas] drop raw:", raw)
        const payload = parseShapeDrag(raw)
        if (!payload) return

        e.preventDefault()
        e.stopPropagation()

        // Convert screen → flow coordinates using the viewport DOM state
        const position = screenToFlowPosition(e.clientX, e.clientY)

        addNodeMutation({
          shape: payload.shape,
          w: payload.w,
          h: payload.h,
          flowX: position.x,
          flowY: position.y,
        })
      } catch (err) {
        console.error("[FlowCanvas] drop handler error:", err)
      }
    },
    [addNodeMutation],
  )

  // Native fallback: attach DOM listeners directly to `.react-flow` element.
  // Some browsers or environment setups prevent React synthetic handlers
  // from firing reliably; native listeners ensure we capture native drops.
  const [nativePendingDrop, setNativePendingDrop] = useState<AddNodePayload | null>(null)

  useEffect(() => {
    if (!nativePendingDrop) return
    addNodeMutation(nativePendingDrop)
    setNativePendingDrop(null)
  }, [nativePendingDrop, addNodeMutation])

  useEffect(() => {
    const rfEl = document.querySelector(".react-flow") as HTMLElement | null
    if (!rfEl) return

    const onNativeDragOver = (ev: Event) => {
      try {
        const e: any = ev
        const types = Array.from((e.dataTransfer && e.dataTransfer.types) || [])
        console.log("[FlowCanvas native] dragover types:", types)
        if (types.includes("application/x-kubecanvas-shape") || types.includes("application/x-kubecanvas-logo")) {
          e.preventDefault()
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
        }
      } catch (err) {
        // ignore
      }
    }

    const onNativeDrop = (ev: Event) => {
      try {
        const e: any = ev

        // Check for logo drop first
        const logoRaw = (e.dataTransfer && (e.dataTransfer.getData("application/x-kubecanvas-logo") || e.dataTransfer.getData("text/plain"))) || ""
        const logoPayload = parseLogoDragToCanvas(logoRaw)
        if (logoPayload) {
          e.preventDefault()
          e.stopPropagation()
          const pos = screenToFlowPosition(e.clientX, e.clientY)
          setNativePendingDrop({
            shape: "rectangle",
            w: logoPayload.w,
            h: logoPayload.h,
            flowX: pos.x,
            flowY: pos.y,
            logo: logoPayload.icon,
            logoCustomSvg: logoPayload.customSvg,
            label: logoPayload.label,
          })
          return
        }

        // Fall back to shape drop
        const raw = (e.dataTransfer && (e.dataTransfer.getData("application/x-kubecanvas-shape") || e.dataTransfer.getData("text/plain"))) || ""
        console.log("[FlowCanvas native] drop raw:", raw, "client:", e.clientX, e.clientY)
        const payload = parseShapeDrag(raw)
        if (!payload) return

        e.preventDefault()
        e.stopPropagation()

        const pos = screenToFlowPosition(e.clientX, e.clientY)
        setNativePendingDrop({
          shape: payload.shape,
          w: payload.w,
          h: payload.h,
          flowX: pos.x,
          flowY: pos.y,
        })
      } catch (err) {
        console.error("[FlowCanvas native drop error]:", err)
      }
    }

    rfEl.addEventListener("dragover", onNativeDragOver)
    rfEl.addEventListener("drop", onNativeDrop)

    return () => {
      rfEl.removeEventListener("dragover", onNativeDragOver)
      rfEl.removeEventListener("drop", onNativeDrop)
    }
  }, [addNodeMutation])

  return (
    <ShapePanelContext.Provider
      value={{
        addNode: handleAddNode,
        onClear: () => clearNodesMutation(),
        onOpenLogoPicker: () => setLogoPickerOpen((v) => !v),
        logoPickerOpen,
      }}
    >
      {/* Canvas state loader — fetches saved state if room is empty */}
      {!canvasLoaded && (
        <CanvasLoader projectId={projectId} onLoaded={() => setCanvasLoaded(true)} />
      )}

      {/* Save status indicator — top-left below navbar */}
      <SaveStatusIndicator status={saveStatus} />

      {/* Collaborator avatars — top-right, hidden when AI sidebar is open */}
      <div className={`absolute top-16 right-4 z-[61] ${aiSidebarOpen ? "pointer-events-none opacity-0" : ""}`}>
        <CollaboratorAvatars />
      </div>

      {/* Shape panel + clear — bottom-center */}
      <ShapePanel />

      {/* Logo picker panel */}
      <LogoPicker
        isOpen={logoPickerOpen}
        onClose={() => setLogoPickerOpen(false)}
        onAddLogo={handleAddLogo}
      />

      {/* AI sidebar — rendered inside RoomProvider so feed hooks work */}
      <FeedProvider>
        <AiSidebar
          isOpen={!!aiSidebarOpen}
          onClose={onAiSidebarClose ?? (() => {})}
          projectId={projectId}
          currentUserId={currentUserId}
        />
      </FeedProvider>

      <div
        className="h-full w-full"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={safeNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={40}
          snapToGrid
          snapGrid={[10, 10]}
          fitView
          defaultViewport={defaultViewport}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          onMove={handleMove}
        >
          <LiveCursors currentUserId={currentUserId} viewport={viewport} />
          <AgentCursor />
          <ReactFlowControls />
          <TemplateImporter
            pendingTemplate={pendingTemplate}
            onTemplateImported={onTemplateImported}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--border-subtle)"
          />
        </ReactFlow>
      </div>
    </ShapePanelContext.Provider>
  )
}

// ── Canvas controls that must live inside <ReactFlow> (needs the provider context) ──
function ReactFlowControls() {
  const reactFlowInstance = useReactFlow()
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  const deleteNodesMutation = useMutation(({ storage }, nodeIds: string[]) => {
    try {
      const flow = storage.get("flow")
      if (!flow) return
      const nodesMap = flow.get("nodes")
      const edgesMap = flow.get("edges")

      // Delete selected nodes
      for (const id of nodeIds) {
        nodesMap.delete(id)
      }

      // Delete edges connected to removed nodes
      const toDeleteEdges: string[] = []
      edgesMap.forEach((edge, key) => {
        const source = typeof (edge as any).get === "function" ? (edge as any).get("source") : (edge as any).source
        const target = typeof (edge as any).get === "function" ? (edge as any).get("target") : (edge as any).target
        if (nodeIds.includes(source) || nodeIds.includes(target)) {
          toDeleteEdges.push(key)
        }
      })
      for (const k of toDeleteEdges) edgesMap.delete(k)
    } catch (err) {
      console.error("[ReactFlowControls] deleteNodes error:", err)
    }
  }, [])

  const deleteEdgesMutation = useMutation(({ storage }, edgeIds: string[]) => {
    try {
      const flow = storage.get("flow")
      if (!flow) return
      const edgesMap = flow.get("edges")
      for (const id of edgeIds) {
        edgesMap.delete(id)
      }
    } catch (err) {
      console.error("[ReactFlowControls] deleteEdges error:", err)
    }
  }, [])

  const deleteSelected = useCallback(() => {
    if (!reactFlowInstance) return
    const selectedNodes = reactFlowInstance.getNodes().filter((n) => n.selected)
    const selectedEdges = reactFlowInstance.getEdges().filter((e) => e.selected)
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return
    if (selectedNodes.length > 0) deleteNodesMutation(selectedNodes.map((n) => n.id))
    if (selectedEdges.length > 0) deleteEdgesMutation(selectedEdges.map((e) => e.id))
  }, [reactFlowInstance, deleteNodesMutation, deleteEdgesMutation])

  useKeyboardShortcuts({ reactFlowInstance, undo, redo, deleteSelected })

  return (
    <CanvasControls
      reactFlowInstance={reactFlowInstance}
      canUndo={canUndo}
      canRedo={canRedo}
      undo={undo}
      redo={redo}
    />
  )
}

// ── Template importer (must live inside <ReactFlow> for useReactFlow) ──
function TemplateImporter({
  pendingTemplate,
  onTemplateImported,
}: {
  pendingTemplate?: CanvasTemplate | null
  onTemplateImported?: () => void
}) {
  const reactFlowInstance = useReactFlow()

  const importMutation = useMutation(
    ({ storage }, template: CanvasTemplate) => {
      try {
        const flow = storage.get("flow")
        if (!flow) return

        // Clear all existing nodes
        const nodesMap = flow.get("nodes")
        const nodeKeys: string[] = []
        nodesMap.forEach((_n: any, k: string) => nodeKeys.push(k))
        for (const k of nodeKeys) nodesMap.delete(k)

        // Clear all existing edges
        const edgesMap = flow.get("edges")
        const edgeKeys: string[] = []
        edgesMap.forEach((_e: any, k: string) => edgeKeys.push(k))
        for (const k of edgeKeys) edgesMap.delete(k)

        // Add template nodes as LiveObjects
        for (const node of template.nodes) {
          nodesMap.set(
            node.id,
            new LiveObject({
              id: node.id,
              type: "canvasNode",
              position: { x: node.x, y: node.y },
              width: node.width,
              height: node.height,
              data: new LiveObject({
                label: node.label,
                color: node.color,
                textColor: node.textColor,
                shape: node.shape,
              }),
              selected: false,
              dragging: false,
            }) as never,
          )
        }

        // Add template edges as LiveObjects
        // (type, markerEnd, style are handled by defaultEdgeOptions in ReactFlow)
        for (const edge of template.edges) {
          edgesMap.set(
            edge.id,
            new LiveObject({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle ?? null,
              targetHandle: edge.targetHandle ?? null,
            }) as never,
          )
        }
      } catch (err) {
        console.error("[TemplateImporter] import error:", err)
      }
    },
    [],
  )

  useEffect(() => {
    if (!pendingTemplate) return
    importMutation(pendingTemplate)
    onTemplateImported?.()
    // Allow CRDT propagation + React re-render before fitting viewport
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({ duration: 300, padding: 0.2 })
    }, 150)
    return () => clearTimeout(timer)
  }, [pendingTemplate, importMutation, onTemplateImported, reactFlowInstance])

  return null
}

// ── Canvas state loader (must live inside <ReactFlow> for useMutation) ──
function CanvasLoader({
  projectId,
  onLoaded,
}: {
  projectId: string
  onLoaded?: () => void
}) {
  const loadedRef = useRef(false)

  const loadMutation = useMutation(
    ({ storage }, canvasJson: { nodes: any[]; edges: any[] }) => {
      try {
        const flow = storage.get("flow")
        if (!flow) return

        const nodesMap = flow.get("nodes")
        const edgesMap = flow.get("edges")

        // Only load if the room is empty — skip if active collaboration exists
        let nodeCount = 0
        nodesMap.forEach(() => nodeCount++)
        if (nodeCount > 0) return

        // Load nodes
        for (const node of canvasJson.nodes) {
          nodesMap.set(
            node.id,
            new LiveObject({
              id: node.id,
              type: node.type || "canvasNode",
              position: node.position,
              width: node.width,
              height: node.height,
              data: new LiveObject({
                label: node.data?.label ?? "",
                color: node.data?.color ?? "#6457f9",
                textColor: node.data?.textColor ?? "#8b82ff",
                shape: node.data?.shape ?? "rectangle",
              }),
              selected: false,
              dragging: false,
            }) as never,
          )
        }

        // Load edges
        for (const edge of canvasJson.edges) {
          edgesMap.set(
            edge.id,
            new LiveObject({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle ?? null,
              targetHandle: edge.targetHandle ?? null,
            }) as never,
          )
        }
      } catch (err) {
        console.error("[CanvasLoader] load error:", err)
      }
    },
    [],
  )

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    fetch(`/api/projects/${projectId}/canvas`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.canvasJson) {
          loadMutation(data.canvasJson)
        }
      })
      .catch(() => {
        // Silently ignore load errors
      })
      .finally(() => {
        onLoaded?.()
      })
  }, [projectId, loadMutation, onLoaded])

  return null
}

// ── Save status indicator ──────────────────────────────────────────────
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null

  return (
    <div className="absolute top-16 left-4 z-[61] pointer-events-none">
      <div
        className={`
          flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
          border backdrop-blur-xl transition-all duration-300
          ${status === "saving"
            ? "border-white/[0.08] bg-white/[0.04] text-muted-foreground"
            : status === "saved"
            ? "border-[var(--state-success)]/20 bg-[var(--state-success)]/10 text-[var(--state-success)]"
            : "border-[var(--state-error)]/20 bg-[var(--state-error)]/10 text-[var(--state-error)]"
          }
        `}
      >
        {status === "saving" && (
          <>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
            Saving…
          </>
        )}
        {status === "saved" && (
          <>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--state-success)]" />
            Saved
          </>
        )}
        {status === "error" && (
          <>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--state-error)]" />
            Save failed
          </>
        )}
      </div>
    </div>
  )
}

// ── Loading state ─────────────────────────────────────────────────────
function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-sm text-muted-foreground animate-pulse">
        Connecting to canvas…
      </p>
    </div>
  )
}

// ── Error boundary for Liveblocks connection issues ────────────────────
function CanvasError({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <ErrorBoundary fallback={<CanvasErrorFallback />}>
      <div className={className}>{children}</div>
    </ErrorBoundary>
  )
}

function CanvasErrorFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <p className="text-sm text-destructive">Failed to connect to canvas</p>
      <p className="text-xs text-faint">Check your connection and try refreshing</p>
    </div>
  )
}

import { Component, type ReactNode, type ErrorInfo } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Canvas error:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// ── Exported wrapper ───────────────────────────────────────────────────
export interface CanvasEditorProps {
  roomId: string
  projectId: string
  pendingTemplate?: CanvasTemplate | null
  onTemplateImported?: () => void
  currentUserId: string
  aiSidebarOpen?: boolean
  onAiSidebarClose?: () => void
  onSaveApi?: (api: { manualSave: () => void; status: SaveStatus }) => void
}

export function CanvasEditor({
  roomId,
  projectId,
  pendingTemplate,
  onTemplateImported,
  currentUserId,
  aiSidebarOpen,
  onAiSidebarClose,
  onSaveApi,
}: CanvasEditorProps) {
  return (
    <CanvasError className="h-full w-full">
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
      >
        <RoomProvider
          id={roomId}
          initialPresence={{ cursor: null, isThinking: false, agentCursor: null }}
          initialStorage={{
            flow: new LiveObject({
              nodes: new LiveMap(),
              edges: new LiveMap(),
            }),
          }}
        >
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <FlowCanvas
              projectId={projectId}
              pendingTemplate={pendingTemplate}
              onTemplateImported={onTemplateImported}
              currentUserId={currentUserId}
              aiSidebarOpen={aiSidebarOpen}
              onAiSidebarClose={onAiSidebarClose}
              onSaveApi={onSaveApi}
            />
          </ClientSideSuspense>
        </RoomProvider>
      </LiveblocksProvider>
    </CanvasError>
  )
}

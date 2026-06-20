"use client"

import {
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
  type AddNodePayload,
} from "@/components/editor/shape-panel"
import { CanvasControls } from "@/components/editor/canvas-controls"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { DEFAULT_NODE_COLOR, NODE_COLORS } from "@/types/canvas"
import { parseShapeDrag, SHAPES } from "@/lib/canvas-shapes"

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
function FlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow({ suspense: true })

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
          const { shape, w, h, flowX, flowY } = payload
          const x = flowX - w / 2
          const y = flowY - h / 2
          const id = generateNodeId(shape)
          const nodesMap = storage.get("flow").get("nodes")

          console.log("[FlowCanvas] addNodeMutation payload:", payload)
          let before = 0
          nodesMap.forEach(() => before++)

          // Per spec: create nodes with an empty label. From earlier
          // debugging we learned the stored node color must be visible
          // against the dark canvas, so choose a readable default color.
          const visibleDefaultColor = "#6457f9"

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
                label: "",
                color: visibleDefaultColor,
                textColor: "#8b82ff",
                shape,
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

    // Clear all nodes mutation (deletes every entry in the nodes map)
    const clearNodesMutation = useMutation(({ storage }) => {
      try {
        const flow = storage.get("flow")
        if (!flow) return
        const nodesMap = flow.get("nodes")
        const toDelete: string[] = []
        nodesMap.forEach((_n, k) => toDelete.push(k))
        for (const k of toDelete) nodesMap.delete(k)
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

  // ── External drag-drop handlers on wrapper div ────────────────────
  // ReactFlow v12 uses pointer events internally and does not consume
  // native drag/drop events, so they bubble up to this wrapper div.
  const handleDragOver = useCallback((e: DragEvent) => {
    try {
      const types = Array.from(e.dataTransfer.types || [])
      console.log("[FlowCanvas] dragover types:", types)
      if (types.includes("application/x-kubecanvas-shape")) {
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
        if (types.includes("application/x-kubecanvas-shape")) {
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
    <ShapePanelContext.Provider value={{ addNode: handleAddNode }}>
      <div
        className="h-full w-full"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Floating clear button */}
        <div className="absolute top-16 right-4 z-[61]">
          <button
            onClick={() => clearNodesMutation()}
            className="rounded-lg border border-white/[0.08] bg-black/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl hover:bg-white/[0.06] hover:text-foreground transition-colors shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
            title="Clear all nodes from canvas"
          >
            Clear All
          </button>
        </div>
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
        >
          <ReactFlowControls />
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

  useKeyboardShortcuts({ reactFlowInstance, undo, redo })

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
}

export function CanvasEditor({ roomId }: CanvasEditorProps) {
  return (
    <CanvasError className="h-full w-full">
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
      >
        <RoomProvider
          id={roomId}
          initialPresence={{ cursor: null, isThinking: false }}
          initialStorage={{
            flow: new LiveObject({
              nodes: new LiveMap(),
              edges: new LiveMap(),
            }),
          }}
        >
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <FlowCanvas />
          </ClientSideSuspense>
        </RoomProvider>
      </LiveblocksProvider>
    </CanvasError>
  )
}

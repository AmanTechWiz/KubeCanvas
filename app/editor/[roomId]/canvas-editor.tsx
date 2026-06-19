"use client"

import { Suspense } from "react"
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  ConnectionMode,
} from "@xyflow/react"
import { LiveObject, LiveMap } from "@liveblocks/client"
import "@xyflow/react/dist/style.css"

// ── React Flow defaults ────────────────────────────────────────────────
const defaultViewport = { x: 0, y: 0, zoom: 1 }

// ── Inner canvas that runs inside the Room ────────────────────────────
function FlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow({ suspense: true })

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        fitView
        defaultViewport={defaultViewport}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          pannable
          zoomable
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
          }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border-subtle)" />
      </ReactFlow>
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
function CanvasError({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<CanvasErrorFallback />}>
      {children}
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
    <CanvasError>
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

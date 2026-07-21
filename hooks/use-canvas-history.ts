"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useHistory, useMutation, useStorage } from "@liveblocks/react"
import { LiveObject } from "@liveblocks/client"

// ── Universal canvas undo/redo ("photo album") ─────────────────────
//
// Liveblocks' native undo stack is client-local: it only records ops the
// local browser dispatches, so server-side AI mutations are invisible to it
// and stale inverse ops corrupt the canvas when replayed across AI edits.
//
// This hook replaces it with an app-level snapshot history: every settled
// change (human gesture, template import, Clear All, collaborator edit, or
// a full AI agent run) becomes ONE undoable photo of the whole canvas.
// Undo/redo restore complete snapshots, so old and new states can never
// overlap.

interface SnapshotNode {
  id: string
  type: string
  position: { x: number; y: number }
  width: number | null
  height: number | null
  data: Record<string, unknown>
}

interface SnapshotEdge {
  id: string
  source: string
  target: string
  sourceHandle: string | null
  targetHandle: string | null
  label: string | null
  data: Record<string, unknown> | null
}

export interface CanvasSnapshot {
  nodes: SnapshotNode[]
  edges: SnapshotEdge[]
}

const MAX_HISTORY = 50
const CAPTURE_DEBOUNCE_MS = 800

function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(obj).sort()) out[k] = obj[k]
  return out
}

export function takeCanvasSnapshot(
  nodes: any[],
  edges: any[],
): CanvasSnapshot {
  return {
    nodes: (nodes ?? []).map((n) => ({
      id: n.id,
      type: (n as { type?: string }).type ?? "canvasNode",
      position: {
        x: n.position?.x ?? 0,
        y: n.position?.y ?? 0,
      },
      width: (n as { width?: number }).width ?? null,
      height: (n as { height?: number }).height ?? null,
      data: sortObject({ ...((n.data ?? {}) as Record<string, unknown>) }),
    })),
    edges: (edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      label: typeof (e as { label?: unknown }).label === "string" ? (e as { label: string }).label : null,
      data: e.data ? sortObject({ ...(e.data as Record<string, unknown>) }) : null,
    })),
  }
}

function snapshotsEqual(a: CanvasSnapshot, b: CanvasSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function useCanvasHistory({
  nodes,
  edges,
  ready,
}: {
  nodes: any[]
  edges: any[]
  /** Becomes true once the initial canvas load finished — baseline is taken then. */
  ready: boolean
}) {
  const history = useHistory()
  const agentThinking = useStorage((root) => root.agentThinking) ?? false

  const pastRef = useRef<CanvasSnapshot[]>([])
  const futureRef = useRef<CanvasSnapshot[]>([])
  const committedRef = useRef<CanvasSnapshot | null>(null)
  const restoringRef = useRef(false)
  const aiPendingRef = useRef<CanvasSnapshot | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevReadyRef = useRef(false)
  const prevThinkingRef = useRef(false)

  // Always-fresh view of the canvas for timers/callbacks
  const latestRef = useRef({ nodes, edges })
  latestRef.current = { nodes, edges }

  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const syncFlags = useCallback(() => {
    setCanUndo(!agentThinking && pastRef.current.length > 0)
    setCanRedo(!agentThinking && futureRef.current.length > 0)
  }, [agentThinking])

  const pushPast = useCallback((snapshot: CanvasSnapshot) => {
    pastRef.current.push(snapshot)
    if (pastRef.current.length > MAX_HISTORY) {
      pastRef.current.shift()
    }
  }, [])

  const cancelPendingCapture = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }, [])

  // ── Restore a full snapshot into Liveblocks storage ────────────────
  const restoreMutation = useMutation(
    ({ storage }, snapshot: CanvasSnapshot) => {
      const flow = storage.get("flow")
      if (!flow) return
      const nodesMap = flow.get("nodes")
      const edgesMap = flow.get("edges")

      const nodeKeys: string[] = []
      nodesMap.forEach((_n, k) => nodeKeys.push(k))
      for (const k of nodeKeys) nodesMap.delete(k)

      const edgeKeys: string[] = []
      edgesMap.forEach((_e, k) => edgeKeys.push(k))
      for (const k of edgeKeys) edgesMap.delete(k)

      for (const n of snapshot.nodes) {
        nodesMap.set(
          n.id,
          new LiveObject({
            id: n.id,
            type: n.type,
            position: { ...n.position },
            ...(n.width != null ? { width: n.width } : {}),
            ...(n.height != null ? { height: n.height } : {}),
            data: new LiveObject({ ...n.data } as any),
            selected: false,
            dragging: false,
          }) as never,
        )
      }

      for (const e of snapshot.edges) {
        edgesMap.set(
          e.id,
          new LiveObject({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            ...(e.label != null ? { label: e.label } : {}),
            ...(e.data ? { data: new LiveObject({ ...e.data } as any) } : {}),
          }) as never,
        )
      }
    },
    [],
  )

  const applySnapshot = useCallback(
    (target: CanvasSnapshot) => {
      restoringRef.current = true
      // history.disable keeps the restore itself off Liveblocks' native
      // undo stack — our snapshot engine is the only canvas history.
      history.disable(() => restoreMutation(target))
      committedRef.current = target
      setTimeout(() => {
        restoringRef.current = false
      }, 0)
    },
    [history, restoreMutation],
  )

  // ── Baseline: first stable state once the canvas has loaded ───────
  useEffect(() => {
    if (!ready || prevReadyRef.current) return
    prevReadyRef.current = true
    committedRef.current = takeCanvasSnapshot(
      latestRef.current.nodes,
      latestRef.current.edges,
    )
    pastRef.current = []
    futureRef.current = []
    syncFlags()
  }, [ready, syncFlags])

  // ── Auto-capture: any settled canvas change becomes one entry ─────
  useEffect(() => {
    if (!ready || !prevReadyRef.current) return
    if (agentThinking) return // AI boundary effect handles AI changes
    if (restoringRef.current) return

    const committed = committedRef.current
    if (!committed) return

    const current = takeCanvasSnapshot(nodes, edges)
    if (snapshotsEqual(current, committed)) return

    cancelPendingCapture()
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      if (restoringRef.current) return
      const latest = takeCanvasSnapshot(
        latestRef.current.nodes,
        latestRef.current.edges,
      )
      const committedNow = committedRef.current
      if (!committedNow || snapshotsEqual(latest, committedNow)) return
      pushPast(committedNow)
      committedRef.current = latest
      futureRef.current = []
      syncFlags()
    }, CAPTURE_DEBOUNCE_MS)
  }, [nodes, edges, ready, agentThinking, cancelPendingCapture, pushPast, syncFlags])

  // ── AI run boundary: one undo step for the entire run ─────────────
  useEffect(() => {
    const prev = prevThinkingRef.current
    prevThinkingRef.current = agentThinking

    if (agentThinking && !prev) {
      // AI starting — freeze the pre-AI state. Flush any un-captured
      // human change first so it stays its own undo step.
      cancelPendingCapture()
      const current = takeCanvasSnapshot(
        latestRef.current.nodes,
        latestRef.current.edges,
      )
      const committed = committedRef.current
      if (committed && !snapshotsEqual(current, committed)) {
        pushPast(committed)
        committedRef.current = current
      }
      aiPendingRef.current = committedRef.current
    } else if (!agentThinking && prev) {
      // AI finished — the whole run becomes ONE undo entry.
      cancelPendingCapture()
      const current = takeCanvasSnapshot(
        latestRef.current.nodes,
        latestRef.current.edges,
      )
      const preAi = aiPendingRef.current
      aiPendingRef.current = null
      if (preAi && !snapshotsEqual(current, preAi)) {
        pushPast(preAi)
        futureRef.current = []
      }
      committedRef.current = current
    }
    syncFlags()
  }, [agentThinking, cancelPendingCapture, pushPast, syncFlags])

  // ── Undo / redo ───────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (agentThinking) return
    cancelPendingCapture()

    const current = takeCanvasSnapshot(
      latestRef.current.nodes,
      latestRef.current.edges,
    )
    const committed = committedRef.current

    // Flush an un-captured change (e.g. undo pressed right after a drag)
    if (committed && !snapshotsEqual(current, committed)) {
      pushPast(committed)
      committedRef.current = current
      futureRef.current = []
    }

    const target = pastRef.current.pop()
    if (!target) {
      syncFlags()
      return
    }
    if (committedRef.current) {
      futureRef.current.push(committedRef.current)
    }
    applySnapshot(target)
    syncFlags()
  }, [agentThinking, applySnapshot, cancelPendingCapture, pushPast, syncFlags])

  const redo = useCallback(() => {
    if (agentThinking) return
    cancelPendingCapture()

    const target = futureRef.current.pop()
    if (!target) {
      syncFlags()
      return
    }
    if (committedRef.current) {
      pushPast(committedRef.current)
    }
    applySnapshot(target)
    syncFlags()
  }, [agentThinking, applySnapshot, cancelPendingCapture, pushPast, syncFlags])

  /** Silently adopt the current canvas as the stable state (no history entry). */
  const rebase = useCallback(() => {
    cancelPendingCapture()
    committedRef.current = takeCanvasSnapshot(
      latestRef.current.nodes,
      latestRef.current.edges,
    )
    syncFlags()
  }, [cancelPendingCapture, syncFlags])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return { undo, redo, canUndo, canRedo, rebase }
}

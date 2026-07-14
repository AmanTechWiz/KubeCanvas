"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  /** The current canvas nodes (from useLiveblocksFlow) */
  nodes: unknown[];
  /** The current canvas edges (from useLiveblocksFlow) */
  edges: unknown[];
  /** The project ID to save against */
  projectId: string;
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number;
  /** Called when save status changes */
  onStatusChange?: (status: SaveStatus) => void;
}

interface UseAutosaveReturn {
  /** Manually trigger a save (bypasses debounce) */
  manualSave: () => void;
  /** Current save status */
  status: SaveStatus;
}

/**
 * Watches canvas nodes/edges and debounces saves to the canvas API.
 * Tracks save status: idle → saving → saved → idle.
 * Fires a keepalive fetch on unmount to avoid losing unsaved work.
 * Returns a manualSave function for explicit save triggers.
 */
export function useAutosave({
  nodes,
  edges,
  projectId,
  debounceMs = 2000,
  onStatusChange,
}: UseAutosaveOptions): UseAutosaveReturn {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<SaveStatus>("idle");
  const lastSavedRef = useRef<string>("");
  const mountedRef = useRef(false);
  const [status, setStatusState] = useState<SaveStatus>("idle");

  // Keep latest nodes/edges/projectId in refs so async save always reads current values
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const projectIdRef = useRef(projectId);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  projectIdRef.current = projectId;

  const setStatus = useCallback(
    (newStatus: SaveStatus) => {
      if (statusRef.current !== newStatus) {
        statusRef.current = newStatus;
        setStatusState(newStatus);
        onStatusChange?.(newStatus);
      }
    },
    [onStatusChange],
  );

  /** Internal: single save attempt — returns true on success */
  const attemptSave = useCallback(async (): Promise<boolean> => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const currentProjectId = projectIdRef.current;
    const canvasJson = { nodes: currentNodes, edges: currentEdges };
    const serialized = JSON.stringify(canvasJson);

    // Skip if nothing changed since last save
    if (serialized === lastSavedRef.current) {
      return true;
    }

    setStatus("saving");

    try {
      const res = await fetch(`/api/projects/${currentProjectId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasJson }),
      });

      if (!res.ok) {
        throw new Error(`Save failed: ${res.status}`);
      }

      lastSavedRef.current = serialized;
      setStatus("saved");

      // Reset to idle after 3 seconds so the "saved" indicator is visible
      setTimeout(() => {
        if (statusRef.current === "saved") {
          setStatus("idle");
        }
      }, 3000);

      return true;
    } catch {
      return false;
    }
  }, [setStatus]);

  /**
   * Save with up to 3 retries and exponential backoff.
   * Handles transient failures (DB cold start, network glitch).
   */
  const save = useCallback(async () => {
    const maxAttempts = 3;
    const baseDelayMs = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const ok = await attemptSave();
      if (ok) return;

      // Last attempt failed — set error status
      if (attempt === maxAttempts) {
        setStatus("error");
        return;
      }

      // Wait with exponential backoff before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayMs * Math.pow(2, attempt - 1)),
      );
    }
  }, [attemptSave, setStatus]);

  /** Manual save — clears pending debounce and saves immediately */
  const manualSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    save();
  }, [save]);

  // Warm up the database connection on mount (cold-start prevention)
  useEffect(() => {
    fetch(`/api/projects/${projectId}/canvas`).catch(() => {
      // Best-effort wake-up — failures are handled by retry logic
    });
  }, [projectId]);

  // Debounce saves on nodes/edges changes
  useEffect(() => {
    // Skip the first render — don't autosave on mount
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    // Clear any pending debounce
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the save (including empty state after clear-all)
    timeoutRef.current = setTimeout(() => {
      save();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, debounceMs, save]);

  // Save immediately on unmount (page leave) using keepalive fetch
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (
        mountedRef.current &&
        ((nodes && nodes.length > 0) || (edges && edges.length > 0))
      ) {
        const canvasJson = { nodes, edges };
        const serialized = JSON.stringify(canvasJson);
        if (serialized !== lastSavedRef.current) {
          fetch(`/api/projects/${projectId}/canvas`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ canvasJson }),
            keepalive: true,
          }).catch(() => {
            // Best-effort on unload
          });
        }
      }
    };
  }, [nodes, edges, projectId]);

  return { manualSave, status };
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { NodeShape } from "@/types/canvas";
import { parseShapeDrag } from "@/lib/canvas-shapes";

// ── SVG shape paths for the ghost preview ─────────────────────────────

function GhostRectangle({ color }: { color: string }) {
  return (
    <div
      className="w-full h-full rounded-lg"
      style={{
        background: color,
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    />
  );
}

function GhostPill({ color }: { color: string }) {
  return (
    <div
      className="w-full h-full rounded-full"
      style={{
        background: color,
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    />
  );
}

function GhostCircle({ color }: { color: string }) {
  return (
    <div
      className="w-full h-full rounded-full"
      style={{
        background: color,
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    />
  );
}

function GhostDiamond({ color }: { color: string }) {
  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polygon
        points="50,2 98,50 50,98 2,50"
        fill={color}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function GhostHexagon({ color }: { color: string }) {
  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polygon
        points="25,2 75,2 98,50 75,98 25,98 2,50"
        fill={color}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function GhostCylinder({ color }: { color: string }) {
  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="2" y="15" width="96" height="70" fill={color} />
      <ellipse cx="50" cy="15" rx="48" ry="13" fill={color} stroke="rgba(255,255,255,0.15)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <ellipse cx="50" cy="85" rx="48" ry="13" fill={color} stroke="rgba(255,255,255,0.15)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1="2" y1="15" x2="2" y2="85" stroke="rgba(255,255,255,0.15)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1="98" y1="15" x2="98" y2="85" stroke="rgba(255,255,255,0.15)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const GHOST_SHAPES: Record<NodeShape, React.ComponentType<{ color: string }>> = {
  rectangle: GhostRectangle,
  pill: GhostPill,
  circle: GhostCircle,
  diamond: GhostDiamond,
  hexagon: GhostHexagon,
  cylinder: GhostCylinder,
};

const GHOST_DEFAULT_COLOR = "#6457f9";

// ── Drag preview state ────────────────────────────────────────────────

interface DragState {
  shape: NodeShape;
  w: number;
  h: number;
  x: number;
  y: number;
}

/**
 * Renders a semi-transparent ghost of the shape being dragged from the
 * shape panel.
 *
 * Important: browsers restrict dataTransfer.getData() to the drop event
 * only. During dragover it returns "". So we capture the drag payload
 * during `dragstart` (document-level) into a ref, then use that cached
 * payload on the first `dragover` to initialize the preview. After that,
 * `dragover` only updates cursor position.
 */
export function ShapeDragPreview() {
  const [drag, setDrag] = useState<DragState | null>(null);
  // Cached payload captured during dragstart — getData() is empty during dragover
  const payloadRef = useRef<{ shape: NodeShape; w: number; h: number } | null>(null);

  // ── dragstart: capture the payload (getData works here) ────────────
  const onDragStart = useCallback((e: DragEvent) => {
    try {
      const types = Array.from(e.dataTransfer?.types || []);
      if (!types.includes("application/x-kubecanvas-shape")) return;

      const raw =
        e.dataTransfer?.getData("application/x-kubecanvas-shape") ||
        e.dataTransfer?.getData("text/plain") ||
        "";
      const payload = parseShapeDrag(raw);
      if (payload) {
        payloadRef.current = { shape: payload.shape, w: payload.w, h: payload.h };
      }
    } catch {
      // Defensive
    }
  }, []);

  // ── dragover: initialise on first event, then update position ──────
  const onDragOver = useCallback((e: DragEvent) => {
    try {
      const types = Array.from(e.dataTransfer?.types || []);
      if (!types.includes("application/x-kubecanvas-shape")) return;

      // Suppress default to allow drop
      e.preventDefault();

      const cached = payloadRef.current;
      if (!cached) return;

      setDrag((prev) => {
        if (prev) {
          // Already initialised — just update cursor position
          if (prev.x === e.clientX && prev.y === e.clientY) return prev;
          return { ...prev, x: e.clientX, y: e.clientY };
        }
        // First dragover — initialise the preview
        return {
          shape: cached.shape,
          w: cached.w,
          h: cached.h,
          x: e.clientX,
          y: e.clientY,
        };
      });
    } catch {
      // Defensive
    }
  }, []);

  const cleanup = useCallback(() => {
    setDrag(null);
    payloadRef.current = null;
  }, []);

  useEffect(() => {
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragend", cleanup);
    document.addEventListener("drop", cleanup);

    return () => {
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragend", cleanup);
      document.removeEventListener("drop", cleanup);
    };
  }, [onDragStart, onDragOver, cleanup]);

  if (!drag) return null;

  const Ghost = GHOST_SHAPES[drag.shape];

  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{
        left: drag.x - drag.w / 2,
        top: drag.y - drag.h / 2,
        width: drag.w,
        height: drag.h,
        opacity: 0.5,
      }}
    >
      <Ghost color={GHOST_DEFAULT_COLOR} />
    </div>
  );
}

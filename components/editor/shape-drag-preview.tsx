"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StackIcon from "tech-stack-icons";
import type { NodeShape } from "@/types/canvas";
import { parseShapeDrag } from "@/lib/canvas-shapes";
import { parseLogoDragToCanvas } from "@/lib/logo-data";
import { NODE_COLORS } from "@/types/canvas";

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

const GHOST_DEFAULT_COLOR = NODE_COLORS[0].bg;

// ── Drag preview state ────────────────────────────────────────────────

interface ShapeDragState {
  kind: "shape";
  shape: NodeShape;
  w: number;
  h: number;
  x: number;
  y: number;
}

interface LogoDragState {
  kind: "logo";
  icon: string;
  label: string;
  customSvg?: string;
  w: number;
  h: number;
  x: number;
  y: number;
}

type DragState = ShapeDragState | LogoDragState;

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
  const payloadRef = useRef<DragState | null>(null);

  // ── dragstart: capture the payload (getData works here) ────────────
  const onDragStart = useCallback((e: DragEvent) => {
    try {
      const types = Array.from(e.dataTransfer?.types || []);

      if (types.includes("application/x-kubecanvas-shape")) {
        const raw =
          e.dataTransfer?.getData("application/x-kubecanvas-shape") ||
          e.dataTransfer?.getData("text/plain") ||
          "";
        const payload = parseShapeDrag(raw);
        if (payload) {
          payloadRef.current = { kind: "shape", shape: payload.shape, w: payload.w, h: payload.h, x: 0, y: 0 };
        }
      } else if (types.includes("application/x-kubecanvas-logo")) {
        const raw =
          e.dataTransfer?.getData("application/x-kubecanvas-logo") ||
          e.dataTransfer?.getData("text/plain") ||
          "";
        const payload = parseLogoDragToCanvas(raw);
        if (payload) {
          payloadRef.current = { kind: "logo", icon: payload.icon, label: payload.label, customSvg: payload.customSvg, w: payload.w, h: payload.h, x: 0, y: 0 };
        }
      }
    } catch {
      // Defensive
    }
  }, []);

  // ── dragover: initialise on first event, then update position ──────
  const onDragOver = useCallback((e: DragEvent) => {
    try {
      const types = Array.from(e.dataTransfer?.types || []);
      const isShape = types.includes("application/x-kubecanvas-shape");
      const isLogo = types.includes("application/x-kubecanvas-logo");
      if (!isShape && !isLogo) return;

      // Suppress default to allow drop
      e.preventDefault();

      const cached = payloadRef.current;
      if (!cached) return;

      setDrag((prev) => {
        if (prev) {
          if (prev.x === e.clientX && prev.y === e.clientY) return prev;
          return { ...prev, x: e.clientX, y: e.clientY };
        }
        return { ...cached, x: e.clientX, y: e.clientY };
      });
    } catch {
      // Defensive
    }
  }, []);

  const cleanup = useCallback(() => {
    setDrag(null);
    payloadRef.current = null;
  }, []);

  // ── Logo ghost component ──────────────────────────────────────────
  function LogoGhost({ icon, label, customSvg }: { icon: string; label: string; customSvg?: string }) {
    return (
      <div
        className="w-full h-full rounded-lg flex flex-col items-center justify-center gap-1"
        style={{
          background: GHOST_DEFAULT_COLOR,
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        {customSvg ? (
          <span
            className="h-7 w-7 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: customSvg }}
          />
        ) : icon ? (
          <StackIcon name={icon as any} variant="dark" className="h-7 w-7" />
        ) : null}
        <span className="text-sm font-medium px-2 truncate max-w-full pointer-events-none text-white/80">
          {label}
        </span>
      </div>
    );
  }

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

  if (drag.kind === "shape") {
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
      <LogoGhost icon={drag.icon} label={drag.label} customSvg={drag.customSvg} />
    </div>
  );
}

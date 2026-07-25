"use client";

import { createContext, useContext } from "react";
import {
  RectangleHorizontal,
  Diamond,
  Circle,
  Cylinder,
  Hexagon,
  Type,
  Blocks,
} from "lucide-react";
import {
  SHAPES,
  serializeShapeDrag,
  serializeTextDrag,
  type ShapeDragPayload,
} from "@/lib/canvas-shapes";
import type { NodeShape } from "@/types/canvas";
import { ClearConfirmButton } from "@/components/editor/clear-confirm";

// ── Context for adding nodes from drop ─────────────────────────────────
export interface AddNodePayload {
  shape: NodeShape;
  w: number;
  h: number;
  /** Pre-computed flow coordinates (already converted from screen) */
  flowX: number;
  flowY: number;
  /** Tech-stack-icons icon name for logo nodes */
  logo?: string;
  /** Inline SVG for custom icons not in tech-stack-icons */
  logoCustomSvg?: string;
  /** Pre-set label (used by logo nodes) */
  label?: string;
  /** When true, node auto-enters edit mode on mount (used for text nodes created via double-click) */
  autoEdit?: boolean;
}

interface ShapePanelContextValue {
  addNode: (payload: AddNodePayload) => void;
  onClear?: () => void;
  onOpenLogoPicker?: () => void;
  logoPickerOpen?: boolean;
}

export const ShapePanelContext = createContext<ShapePanelContextValue | null>(
  null,
);

export function useShapePanel(): ShapePanelContextValue {
  const ctx = useContext(ShapePanelContext);
  if (!ctx) throw new Error("useShapePanel must be used within ShapePanelContext");
  return ctx;
}

// ── Shape icons ────────────────────────────────────────────────────────
const SHAPE_ICONS: Record<NodeShape, React.ComponentType<{ className?: string }>> = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  cylinder: Cylinder,
  hexagon: Hexagon,
  text: Type,
};

// ── Text button (click to add at center, or drag to place) ────────────
function TextButton() {
  const { addNode } = useShapePanel();

  const viewportToFlow = () => {
    const rfViewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
    const rfContainer = document.querySelector(".react-flow") as HTMLElement | null;
    if (!rfViewport || !rfContainer) return null;

    const rect = rfContainer.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const transform = rfViewport.style.transform || "";
    const m = transform.match(/translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/);
    const tx = m ? parseFloat(m[1]) : 0;
    const ty = m ? parseFloat(m[2]) : 0;
    const zoom = m ? parseFloat(m[3]) : 1;

    return { flowX: (centerX - tx) / zoom, flowY: (centerY - ty) / zoom };
  };

  const handleClick = () => {
    const pos = viewportToFlow();
    if (!pos) return;
    addNode({ shape: "text", w: 200, h: 40, ...pos, label: "", autoEdit: true });
  };

  const handleDragStart = (e: React.DragEvent) => {
    try {
      const serialized = serializeTextDrag({ text: "", w: 200, h: 40 });
      e.dataTransfer.setData("application/x-kubecanvas-text", serialized);
      e.dataTransfer.setData("text/plain", serialized);
      e.dataTransfer.effectAllowed = "copy";

      const ghost = document.createElement("div");
      ghost.style.cssText = "width:1px;height:1px;position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;";
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => ghost.remove(), 0);
    } catch {
      // Defensive
    }
  };

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      title="Add Text"
      className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground cursor-grab active:cursor-grabbing pointer-events-auto"
    >
      <Type className="h-4 w-4" />
    </button>
  )
}

// ── Shape button ───────────────────────────────────────────────────────
function ShapeButton({ shape, label }: { shape: ShapeDragPayload; label: string }) {
  const Icon = SHAPE_ICONS[shape.shape];

  const handleDragStart = (e: React.DragEvent) => {
    try {
      console.log("[ShapePanel] dragstart", shape)
      const serialized = serializeShapeDrag(shape)
      e.dataTransfer.setData("application/x-kubecanvas-shape", serialized)
      e.dataTransfer.setData("text/plain", serialized)
      e.dataTransfer.effectAllowed = "copy"

      const ghost = document.createElement("div")
      ghost.style.cssText = "width:1px;height:1px;position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;"
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, 0, 0)
      setTimeout(() => ghost.remove(), 0)
    } catch {
      // Defensive: some browsers restrict dataTransfer access in certain contexts
    }
  };

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground cursor-grab active:cursor-grabbing pointer-events-auto"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// ── Shape panel component ──────────────────────────────────────────────
export function ShapePanel() {
  const ctx = useContext(ShapePanelContext);
  const onClear = ctx?.onClear;
  const onOpenLogoPicker = ctx?.onOpenLogoPicker;
  const logoPickerOpen = ctx?.logoPickerOpen;

  return (
    <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 pointer-events-none">
      <div className="flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-black/60 px-2 py-1.5 backdrop-blur-xl backdrop-saturate-150 shadow-[0_2px_24px_rgba(0,0,0,0.4),inset_0_0.5px_0_rgba(255,255,255,0.06)]">
        {/* Logo picker button */}
        <button
          onClick={() => onOpenLogoPicker?.()}
          title="Technology Logos"
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer pointer-events-auto ${
            logoPickerOpen
              ? "bg-white/[0.1] text-foreground"
              : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          }`}
        >
          <Blocks className="h-4 w-4" />
        </button>
        <TextButton />
        <div className="mx-0.5 h-5 w-px bg-white/[0.12]" />
        {SHAPES.map((s) => (
          <ShapeButton
            key={s.shape}
            shape={{ shape: s.shape, w: s.w, h: s.h }}
            label={s.label}
          />
        ))}
        {onClear && (
          <>
            <div className="mx-1 h-5 w-px bg-white/[0.12]" />
            <ClearConfirmButton onConfirm={onClear} />
          </>
        )}
      </div>
    </div>
  );
}

import type { NodeShape } from "@/types/canvas";

// ── Shape definitions for the shape panel ──────────────────────────────
export interface ShapeDefinition {
  shape: NodeShape;
  label: string;
  /** Default width in pixels */
  w: number;
  /** Default height in pixels */
  h: number;
}

export const SHAPES: ShapeDefinition[] = [
  { shape: "rectangle", label: "Rectangle", w: 192, h: 128 },
  { shape: "diamond", label: "Diamond", w: 160, h: 160 },
  { shape: "circle", label: "Circle", w: 140, h: 140 },
  { shape: "pill", label: "Pill", w: 192, h: 80 },
  { shape: "cylinder", label: "Cylinder", w: 160, h: 140 },
  { shape: "hexagon", label: "Hexagon", w: 192, h: 128 },
];

// ── Drag payload ───────────────────────────────────────────────────────
export interface ShapeDragPayload {
  shape: NodeShape;
  w: number;
  h: number;
}

export function serializeShapeDrag(payload: ShapeDragPayload): string {
  return JSON.stringify(payload);
}

export function parseShapeDrag(raw: string): ShapeDragPayload | null {
  try {
    const data = JSON.parse(raw);
    if (
      data &&
      typeof data.shape === "string" &&
      typeof data.w === "number" &&
      typeof data.h === "number"
    ) {
      return data as ShapeDragPayload;
    }
    return null;
  } catch {
    return null;
  }
}

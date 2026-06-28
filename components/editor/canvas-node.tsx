import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";
import type { CanvasNode, NodeColor } from "@/types/canvas";
import { NODE_COLORS, DEFAULT_NODE_COLOR, textColorForBg } from "@/types/canvas";
import type { NodeShape } from "@/types/canvas";
import { ColorToolbar } from "@/components/editor/color-toolbar";
import StackIcon from "tech-stack-icons";

// ── Border config ─────────────────────────────────────────────────────
const BORDER_REST = "border-white/[0.12]";
const BORDER_SELECTED = "border-white/[0.35]";

// ── CSS shape renderers ───────────────────────────────────────────────

function RectangleShape({ fill, selected }: { fill: string; selected: boolean }) {
  return (
    <div
      className={`absolute inset-0 rounded-lg border overflow-hidden ${selected ? BORDER_SELECTED : BORDER_REST}`}
      style={{ background: fill }}
    />
  );
}

function PillShape({ fill, selected }: { fill: string; selected: boolean }) {
  return (
    <div
      className={`absolute inset-0 rounded-[9999px] border overflow-hidden ${selected ? BORDER_SELECTED : BORDER_REST}`}
      style={{ background: fill }}
     />
  );
}

function CircleShape({ fill, selected }: { fill: string; selected: boolean }) {
  const stroke = selected ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)";
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <circle
        cx="50"
        cy="50"
        r="48"
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── SVG shape renderers (scale with node size via viewBox) ────────────

function DiamondShape({ fill, selected }: { fill: string; selected: boolean }) {
  const stroke = selected ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)";
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polygon
        points="50,2 98,50 50,98 2,50"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function HexagonShape({ fill, selected }: { fill: string; selected: boolean }) {
  const stroke = selected ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)";
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polygon
        points="25,2 75,2 98,50 75,98 25,98 2,50"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function CylinderShape({ fill, selected }: { fill: string; selected: boolean }) {
  const stroke = selected ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)";
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Body rectangle */}
      <rect x="2" y="15" width="96" height="70" fill={fill} />
      {/* Top ellipse */}
      <ellipse cx="50" cy="15" rx="48" ry="13" fill={fill} stroke={stroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      {/* Bottom ellipse */}
      <ellipse cx="50" cy="85" rx="48" ry="13" fill={fill} stroke={stroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      {/* Side strokes */}
      <line x1="2" y1="15" x2="2" y2="85" stroke={stroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      <line x1="98" y1="15" x2="98" y2="85" stroke={stroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      {/* Body top stroke */}
      <line x1="2" y1="15" x2="98" y2="15" stroke={stroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── Shape dispatcher ──────────────────────────────────────────────────

const CSS_SHAPES: Record<string, React.ComponentType<{ fill: string; selected: boolean }>> = {
  rectangle: RectangleShape,
  pill: PillShape,
};

const SVG_SHAPES: Record<string, React.ComponentType<{ fill: string; selected: boolean }>> = {
  circle: CircleShape,
  diamond: DiamondShape,
  hexagon: HexagonShape,
  cylinder: CylinderShape,
};

function ShapeRenderer({ shape, fill, selected }: { shape: NodeShape; fill: string; selected: boolean }) {
  const CssShape = CSS_SHAPES[shape];
  if (CssShape) return <CssShape fill={fill} selected={selected} />;

  const SvgShape = SVG_SHAPES[shape];
  if (SvgShape) return <SvgShape fill={fill} selected={selected} />;

  // Fallback: rectangle
  return <RectangleShape fill={fill} selected={selected} />;
}

// ── Node component ────────────────────────────────────────────────────
//
// Each side has BOTH a source and target handle so connections can be
// initiated from any side to any side. Handles must be direct children
// of the node wrapper (no intermediate elements) for ReactFlow to
// position them correctly against the node border.

function NodeHandle({
  position,
  type,
}: {
  position: Position;
  type: "source" | "target";
}) {
  return (
    <Handle
      type={type}
      position={position}
      id={`${position}-${type}`}
      className="!w-3 !h-3 !bg-white/80 !border-2 !border-white/30 !rounded-full !-translate-x-1/2 !-translate-y-1/2 opacity-0 group-hover/node:opacity-100 transition-all duration-150 hover:!opacity-100 hover:!scale-150 hover:!bg-white hover:!shadow-[0_0_8px_rgba(255,255,255,0.5)]"
      style={{ zIndex: 10 }}
    />
  );
}

// ── Minimum node dimensions ─────────────────────────────────────────────
const MIN_WIDTH = 60;
const MIN_HEIGHT = 40;

function CanvasNodeComponent({ id, data, selected }: NodeProps<CanvasNode>) {
  const { label, color, shape, logo } = data;
  const fill = color || DEFAULT_NODE_COLOR.bg;
  const shapeType: NodeShape = (shape as NodeShape) || "rectangle";
  const nodeTextColor: string =
    (data.textColor as string) || textColorForBg(fill);
  const { updateNode } = useReactFlow();
  const logoName = (logo as string) || null;
  const logoCustomSvg = (data.logoCustomSvg as string) || null;

  // ── Label editing state ──────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label || "");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const commitLabel = useCallback(() => {
    setEditing(false);
    updateNode(id, (node) => ({
      ...node,
      data: { ...node.data, label: draft },
    }));
  }, [id, draft, updateNode]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(label || "");
  }, [label]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDraft(label || "");
      setEditing(true);
      // Focus the textarea on the next frame so it's rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [label],
  );

  // ── Prevent pointer events from reaching canvas when editing ─────
  const stopPointer = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  // ── Color toolbar handler ────────────────────────────────────────
  const handleColorSelect = useCallback(
    (c: NodeColor) => {
      updateNode(id, (node) => ({
        ...node,
        data: { ...node.data, color: c.bg, textColor: c.text },
      }));
    },
    [id, updateNode],
  );

  return (
    <div className="relative group/node w-full h-full">
      {/* ── Color toolbar (visible only when selected) ─────────── */}
      {selected && (
        <ColorToolbar activeColor={fill} onSelect={handleColorSelect} />
      )}

      {/* ── Resize handles (visible only when selected) ─────────── */}
      <NodeResizer
        isVisible={!!selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        keepAspectRatio={shapeType === "circle"}
        handleClassName="!w-2.5 !h-2.5 !rounded-full !bg-white/60 !border-0 hover:!bg-white hover:!shadow-[0_0_6px_rgba(255,255,255,0.4)] transition-all duration-150"
        lineClassName="!border-white/30"
        autoScale={false}
      />

      {/* Connection handles — both source and target on every side.
          Renders flat (no wrapper elements) so ReactFlow can position
          handles correctly at the node border. */}
      <NodeHandle position={Position.Top} type="source" />
      <NodeHandle position={Position.Top} type="target" />
      <NodeHandle position={Position.Bottom} type="source" />
      <NodeHandle position={Position.Bottom} type="target" />
      <NodeHandle position={Position.Left} type="source" />
      <NodeHandle position={Position.Left} type="target" />
      <NodeHandle position={Position.Right} type="source" />
      <NodeHandle position={Position.Right} type="target" />

      {/* Shape background */}
      <ShapeRenderer shape={shapeType} fill={fill} selected={!!selected} />

      {/* Label + optional logo — centered, editable on double-click */}
      {editing ? (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-auto"
          onPointerDown={stopPointer}
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                cancelEdit();
              }
              // Prevent Enter from inserting a newline — commit instead
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commitLabel();
              }
              // Prevent all keys from reaching the canvas (drag/pan)
              e.stopPropagation();
            }}
            onPointerDown={stopPointer}
            className="resize-none bg-transparent text-sm font-medium text-center outline-none border-none overflow-hidden leading-snug"
            placeholder="Label"
            rows={1}
            style={{ width: "80%", minWidth: 40, color: nodeTextColor }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center cursor-text gap-1"
          onDoubleClick={handleDoubleClick}
        >
          {/* Logo icon (when present) */}
          {logoCustomSvg ? (
            <div
              className="pointer-events-none flex-shrink-0 h-7 w-7 [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: logoCustomSvg }}
            />
          ) : logoName ? (
            <div className="pointer-events-none flex-shrink-0">
              <StackIcon
                name={logoName as any}
                variant="dark"
                className="h-7 w-7"
              />
            </div>
          ) : null}
          {label ? (
            <span
              className="text-sm font-medium px-2 truncate max-w-full pointer-events-none"
              style={{ color: nodeTextColor }}
            >
              {label}
            </span>
          ) : (
            <span className="text-sm pointer-events-none select-none" style={{ color: "rgba(255,255,255,0.3)" }}>
              Label
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const CanvasNodeComponentMemo = memo(CanvasNodeComponent);

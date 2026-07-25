import { memo, useCallback, useRef, useState, Component, createContext, useContext } from "react";
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";
import type { CanvasNode, NodeColor } from "@/types/canvas";
import { NODE_COLORS, DEFAULT_NODE_COLOR, textColorForBg } from "@/types/canvas";
import type { NodeShape } from "@/types/canvas";
import { ColorToolbar } from "@/components/editor/color-toolbar";
import StackIcon from "tech-stack-icons";
import { LOGO_CATEGORIES } from "@/lib/logo-data";

// ── Context for resizing nodes via Liveblocks ────────────────────────
export interface NodeResizeContextValue {
  resizeNode: (id: string, width: number, height: number) => void;
}

export const NodeResizeContext = createContext<NodeResizeContextValue | null>(null);

// ── Error Boundary for invalid StackIcon logos ──────────────────────
interface IconFallbackProps {
  label: string | undefined;
  nodeTextColor: string;
}

function IconFallback({ label, nodeTextColor }: IconFallbackProps) {
  return (
    <div
      className="flex items-center justify-center h-7 w-7 rounded bg-white/[0.08] text-[10px] font-semibold"
      style={{ color: nodeTextColor }}
    >
      {label ? label.charAt(0).toUpperCase() : "?"}
    </div>
  );
}

interface IconBoundaryState {
  hasError: boolean;
}

class IconBoundary extends Component<
  React.PropsWithChildren<IconFallbackProps>,
  IconBoundaryState
> {
  state: IconBoundaryState = { hasError: false };

  static getDerivedStateFromError(): IconBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <IconFallback label={this.props.label} nodeTextColor={this.props.nodeTextColor} />;
    }
    return this.props.children;
  }
}

// Build a lookup map for logo custom SVGs (icons not in tech-stack-icons)
const LOGO_CUSTOM_SVG_MAP: Record<string, string> = {};
for (const cat of LOGO_CATEGORIES) {
  for (const icon of cat.icons) {
    if (icon.customSvg) {
      LOGO_CUSTOM_SVG_MAP[icon.id] = icon.customSvg;
    }
  }
}

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
      id={position}
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
  const isTextShape = shapeType === "text";
  const nodeTextColor: string =
    (data.textColor as string) || textColorForBg(isTextShape ? "#1F1F1F" : fill);
  const reactFlow = useReactFlow();
  const nodeResize = useContext(NodeResizeContext);
  const logoName = (logo as string) || null;
  const logoCustomSvg = (data.logoCustomSvg as string) || null;
  const autoEdit = data.autoEdit === true;

  // ── Label editing state ──────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label || "");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const committedRef = useRef(false);

  // Auto-resize textarea to fit content (used by text shape)
  const autoResizeTextarea = useCallback(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  // Measure text and resize node via Liveblocks (for text shape)
  const resizeToContent = useCallback(() => {
    if (!nodeResize) return;
    const rfNode = reactFlow.getNode(id);
    const currentWidth = rfNode?.measured?.width || rfNode?.width || 200;
    const currentHeight = rfNode?.measured?.height || rfNode?.height || 40;

    const measurer = document.createElement("div");
    measurer.style.cssText = `
      position: absolute; visibility: hidden; white-space: pre-wrap;
      word-break: break-word; font-size: 14px; font-weight: 500;
      line-height: 1.25; padding: 4px 8px; width: ${currentWidth - 16}px;
    `;
    measurer.textContent = draft || " ";
    document.body.appendChild(measurer);
    const textHeight = measurer.scrollHeight;
    document.body.removeChild(measurer);

    const requiredHeight = Math.max(40, textHeight + 16);
    const newHeight = Math.max(currentHeight, requiredHeight);

    if (newHeight !== currentHeight) {
      nodeResize.resizeNode(id, currentWidth, newHeight);
    }
  }, [id, draft, reactFlow, nodeResize]);

  const commitLabel = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
    reactFlow.updateNode(id, (node) => ({ ...node, data: { ...node.data, label: draft, autoEdit: false } }));

    // For text shape, always resize to fit content
    if (isTextShape && nodeResize) {
      resizeToContent();
    } else if (draft && draft.length > 0 && nodeResize) {
      // For regular shapes, only grow height if text wraps
      const rfNode = reactFlow.getNode(id);
      const currentWidth = rfNode?.measured?.width || rfNode?.width || 192;
      const currentHeight = rfNode?.measured?.height || rfNode?.height || 128;

      const measurer = document.createElement("div");
      measurer.style.cssText = `
        position: absolute; visibility: hidden; white-space: pre-wrap;
        word-break: break-word; font-size: 14px; font-weight: 500;
        line-height: 1.25; padding: 0 8px; width: ${currentWidth - 16}px;
      `;
      measurer.textContent = draft;
      document.body.appendChild(measurer);
      const textHeight = measurer.scrollHeight;
      document.body.removeChild(measurer);

      const requiredHeight = Math.max(MIN_HEIGHT, textHeight + 20);
      const newHeight = Math.max(currentHeight, requiredHeight);

      if (newHeight > currentHeight) {
        nodeResize.resizeNode(id, currentWidth, newHeight);
      }
    }
  }, [id, draft, isTextShape, reactFlow, nodeResize, resizeToContent]);

  const cancelEdit = useCallback(() => {
    committedRef.current = false;
    setEditing(false);
    setDraft(label || "");
  }, [label]);

  // ── Auto-edit on mount (for text nodes created via double-click) ──
  const autoEditDone = useRef(false);
  if (autoEdit && !autoEditDone.current && !editing) {
    autoEditDone.current = true;
    committedRef.current = false;
    // Defer state update to avoid setState-during-render
    setTimeout(() => {
      setEditing(true);
      setDraft(label || "");
    }, 0);
  }

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDraft(label || "");
      setEditing(true);
      // Focus the textarea and auto-resize on the next frame
      requestAnimationFrame(() => {
        const ta = inputRef.current;
        if (ta) {
          ta.focus();
          ta.style.height = "auto";
          ta.style.height = `${ta.scrollHeight}px`;
        }
      });
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
      reactFlow.updateNode(id, (node) => ({
        ...node,
        data: { ...node.data, color: c.bg, textColor: c.text },
      }));
    },
    [id, reactFlow],
  );

  return (
    <div className={`relative group/node w-full h-full ${isTextShape ? "" : "min-w-[60px]"}`}>
      {/* ── Color toolbar (visible only when selected, not for text shape) ── */}
      {selected && !isTextShape && (
        <ColorToolbar activeColor={fill} onSelect={handleColorSelect} />
      )}

      {/* ── Resize handles (visible only when selected, not for text shape) ── */}
      {!isTextShape && (
        <NodeResizer
          isVisible={!!selected}
          minWidth={MIN_WIDTH}
          minHeight={MIN_HEIGHT}
          keepAspectRatio={false}
          handleClassName="!w-2.5 !h-2.5 !rounded-full !bg-white/60 !border-0 hover:!bg-white hover:!shadow-[0_0_6px_rgba(255,255,255,0.4)] transition-all duration-150"
          lineClassName="!border-white/30"
          autoScale={false}
        />
      )}

      {/* Connection handles — both source and target on every side.
          Not shown for text shape (standalone, no connections). */}
      {!isTextShape && (
        <>
          <NodeHandle position={Position.Top} type="source" />
          <NodeHandle position={Position.Top} type="target" />
          <NodeHandle position={Position.Bottom} type="source" />
          <NodeHandle position={Position.Bottom} type="target" />
          <NodeHandle position={Position.Left} type="source" />
          <NodeHandle position={Position.Left} type="target" />
          <NodeHandle position={Position.Right} type="source" />
          <NodeHandle position={Position.Right} type="target" />
        </>
      )}

      {/* Shape background — hidden for text shape */}
      {!isTextShape && (
        <ShapeRenderer shape={shapeType} fill={fill} selected={!!selected} />
      )}

      {/* Label + optional logo — centered, editable on double-click */}
      {editing ? (
        <div
          className={`absolute inset-0 z-10 pointer-events-auto overflow-visible ${
            isTextShape ? "flex items-start justify-start" : "flex items-center justify-center"
          }`}
          onPointerDown={stopPointer}
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              autoResizeTextarea();
            }}
            onPaste={() => {
              requestAnimationFrame(() => autoResizeTextarea());
            }}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                cancelEdit();
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commitLabel();
              }
              e.stopPropagation();
            }}
            onPointerDown={stopPointer}
            className={`resize-none bg-transparent text-sm font-medium outline-none border-none leading-snug ${
              isTextShape ? "w-full" : "text-center"
            }`}
            placeholder={isTextShape ? "Type something…" : "Label"}
            style={{
              color: isTextShape ? (nodeTextColor === "#EDEDED" ? "#EDEDED" : nodeTextColor) : nodeTextColor,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflow: "hidden",
              ...(isTextShape
                ? { padding: "4px 8px", minWidth: 60 }
                : { width: "80%", minWidth: 40 }),
            }}
          />
        </div>
      ) : (
        <div
          className={`absolute inset-0 flex cursor-text gap-1 ${
            isTextShape
              ? `items-start justify-start rounded px-1 ${selected ? "border border-white/30" : "border border-transparent"}`
              : "flex-col items-center justify-center"
          }`}
          onDoubleClick={handleDoubleClick}
        >
          {/* Logo icon (when present, not for text shape) */}
          {!isTextShape && (logoCustomSvg || (logoName && LOGO_CUSTOM_SVG_MAP[logoName])) ? (
            <div
              className="pointer-events-none flex-shrink-0 h-7 w-7 [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: logoCustomSvg || LOGO_CUSTOM_SVG_MAP[logoName!] }}
            />
          ) : !isTextShape && logoName ? (
            <div className="pointer-events-none flex-shrink-0">
              <IconBoundary label={label} nodeTextColor={nodeTextColor}>
                <StackIcon
                  name={logoName as any}
                  variant="dark"
                  className="h-7 w-7"
                />
              </IconBoundary>
            </div>
          ) : null}
          {label ? (
            <span
              className={`text-sm font-medium pointer-events-none whitespace-pre-wrap break-words leading-snug ${
                isTextShape ? "px-1 max-w-full" : "px-2 max-w-full"
              }`}
              style={{ color: isTextShape ? (nodeTextColor === "#EDEDED" ? "#EDEDED" : nodeTextColor) : nodeTextColor }}
            >
              {label}
            </span>
          ) : isTextShape ? (
            <span className="text-sm select-none px-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Type something…
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

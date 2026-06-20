import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CanvasNode } from "@/types/canvas";
import { DEFAULT_NODE_COLOR } from "@/types/canvas";

// Simple renderer: per the unit spec, render every node as a bordered
// rectangle with the label centered. Do not display the literal
// "Untitled" fallback — nodes are created with an empty label by
// design.
function CanvasNodeComponent({ data }: NodeProps<CanvasNode>) {
  const { label, color } = data;
  const fill = color || DEFAULT_NODE_COLOR.bg;

  return (
    <div className="relative group w-full h-full">
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-white !border-2 !border-transparent opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-white !border-2 !border-transparent opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-white !border-2 !border-transparent opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-white !border-2 !border-transparent opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* Bordered rectangle background */}
      <div
        className="absolute inset-0 rounded-lg border border-white/[0.12] overflow-hidden"
        style={{ background: "transparent" }}
      >
        <div className="absolute inset-0" style={{ background: fill }} />
      </div>

      {/* Label (centered). Per spec, label may be empty — render it
          as-is without substituting "Untitled". */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-medium text-[#f0f0f4] px-2 truncate max-w-full">
          {label}
        </span>
      </div>
    </div>
  );
}

export const CanvasNodeComponentMemo = memo(CanvasNodeComponent);

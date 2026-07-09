"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { CanvasTemplate, TemplateNode } from "./starter-templates"
import { CANVAS_TEMPLATES } from "./starter-templates"

// ── Public API ─────────────────────────────────────────────────────────

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
}

export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[calc(100%-2rem)] sm:!max-w-4xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Starter Templates</DialogTitle>
          <DialogDescription>
            Choose a pre-built diagram to get started quickly
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
          {CANVAS_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onImport={() => {
                onImport(template)
                onOpenChange(false)
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Template card ──────────────────────────────────────────────────────

function TemplateCard({
  template,
  onImport,
}: {
  template: CanvasTemplate
  onImport: () => void
}) {
  return (
    <div className="group flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden transition-colors hover:bg-white/[0.06] hover:border-white/[0.15]">
      <div className="flex items-center justify-center p-3 bg-black/20">
        <TemplatePreview template={template} />
      </div>
      <div className="flex flex-col gap-1 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{template.name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {template.description}
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={onImport}
          className="mt-2 w-full text-xs"
        >
          Use Template
        </Button>
      </div>
    </div>
  )
}

// ── Lightweight SVG preview ────────────────────────────────────────────

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const PREVIEW_W = 260
  const PREVIEW_H = 170
  const PAD = 16

  // Compute bounding box of all nodes
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of template.nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.width)
    maxY = Math.max(maxY, n.y + n.height)
  }

  const contentW = maxX - minX
  const contentH = maxY - minY
  const scale = Math.min(
    (PREVIEW_W - PAD * 2) / contentW,
    (PREVIEW_H - PAD * 2) / contentH,
  )
  const offX = (PREVIEW_W - contentW * scale) / 2 - minX * scale
  const offY = (PREVIEW_H - contentH * scale) / 2 - minY * scale

  const nodeMap = Object.fromEntries(template.nodes.map((n) => [n.id, n]))

  const getCenter = (n: TemplateNode) => ({
    x: (n.x + n.width / 2) * scale + offX,
    y: (n.y + n.height / 2) * scale + offY,
  })

  // Compute handle-based connection point for a node
  const getHandlePos = (n: TemplateNode, handle?: string) => {
    const cx = (n.x + n.width / 2) * scale + offX
    const cy = (n.y + n.height / 2) * scale + offY
    const hw = (n.width / 2) * scale
    const hh = (n.height / 2) * scale
    switch (handle) {
      case "bottom-source":
      case "bottom-target":
      case "bottom":
        return { x: cx, y: cy + hh }
      case "top-source":
      case "top-target":
      case "top":
        return { x: cx, y: cy - hh }
      case "left-source":
      case "left-target":
      case "left":
        return { x: cx - hw, y: cy }
      case "right-source":
      case "right-target":
      case "right":
        return { x: cx + hw, y: cy }
      default:
        return { x: cx, y: cy }
    }
  }

  return (
    <svg width={PREVIEW_W} height={PREVIEW_H} className="rounded-lg">
      {/* Edges */}
      {template.edges.map((edge) => {
        const s = nodeMap[edge.source]
        const t = nodeMap[edge.target]
        if (!s || !t) return null
        const sc = getHandlePos(s, edge.sourceHandle)
        const tc = getHandlePos(t, edge.targetHandle)
        return (
          <line
            key={edge.id}
            x1={sc.x}
            y1={sc.y}
            x2={tc.x}
            y2={tc.y}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1.5}
          />
        )
      })}
      {/* Nodes */}
      {template.nodes.map((n) => {
        const x = n.x * scale + offX
        const y = n.y * scale + offY
        const w = n.width * scale
        const h = n.height * scale
        const fontSize = Math.max(8, Math.min(11, w / (n.label.length * 0.6)))
        return (
          <g key={n.id}>
            {renderPreviewShape(n.shape, x, y, w, h, n.color)}
            <text
              x={x + w / 2}
              y={y + h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill={n.textColor}
              fontSize={fontSize}
              fontFamily="system-ui, sans-serif"
              fontWeight={500}
            >
              {n.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Shape renderer for SVG preview ─────────────────────────────────────

function renderPreviewShape(
  shape: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  const stroke = "rgba(255,255,255,0.12)"

  switch (shape) {
    case "circle": {
      const r = Math.min(w, h) / 2
      return (
        <circle
          cx={x + w / 2}
          cy={y + h / 2}
          r={r}
          fill={color}
          stroke={stroke}
          strokeWidth={1}
        />
      )
    }
    case "diamond": {
      const cx = x + w / 2
      const cy = y + h / 2
      return (
        <polygon
          points={`${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`}
          fill={color}
          stroke={stroke}
          strokeWidth={1}
        />
      )
    }
    case "hexagon": {
      const cx = x + w / 2
      const cy = y + h / 2
      const rx = w / 2
      const ry = h / 2
      const pts = [
        [cx, cy - ry],
        [cx + rx * 0.866, cy - ry * 0.5],
        [cx + rx * 0.866, cy + ry * 0.5],
        [cx, cy + ry],
        [cx - rx * 0.866, cy + ry * 0.5],
        [cx - rx * 0.866, cy - ry * 0.5],
      ]
        .map((p) => p.join(","))
        .join(" ")
      return (
        <polygon
          points={pts}
          fill={color}
          stroke={stroke}
          strokeWidth={1}
        />
      )
    }
    case "cylinder": {
      const arcH = h * 0.12
      const bodyTop = y + arcH
      const bodyH = h - arcH * 2
      return (
        <g>
          <rect x={x} y={bodyTop} width={w} height={bodyH} fill={color} />
          <ellipse
            cx={x + w / 2}
            cy={bodyTop}
            rx={w / 2}
            ry={arcH}
            fill={color}
            stroke={stroke}
            strokeWidth={1}
          />
          <ellipse
            cx={x + w / 2}
            cy={bodyTop + bodyH}
            rx={w / 2}
            ry={arcH}
            fill={color}
            stroke={stroke}
            strokeWidth={1}
          />
          <line
            x1={x}
            y1={bodyTop}
            x2={x}
            y2={bodyTop + bodyH}
            stroke={stroke}
            strokeWidth={1}
          />
          <line
            x1={x + w}
            y1={bodyTop}
            x2={x + w}
            y2={bodyTop + bodyH}
            stroke={stroke}
            strokeWidth={1}
          />
        </g>
      )
    }
    default:
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={6}
          fill={color}
          stroke={stroke}
          strokeWidth={1}
        />
      )
  }
}

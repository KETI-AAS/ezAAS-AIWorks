"use client"

import {
  Box,
  Boxes,
  ChevronRight,
  Cpu,
  FileText,
  FolderTree,
  Hash,
  Languages,
  Layers,
  Link2,
  ListTree,
  Package,
  Ruler,
  Tag,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import type { AasNodeType, TreeNode } from "@/lib/aas/aas-types"
import { cn } from "@/lib/utils"

/** Icon + color-token mapping for each AAS node type. */
const NODE_STYLE: Record<
  AasNodeType,
  { icon: LucideIcon; text: string; bg: string }
> = {
  Environment: { icon: Boxes, text: "text-primary", bg: "bg-primary/10" },
  AssetAdministrationShell: {
    icon: Package,
    text: "text-primary",
    bg: "bg-primary/10",
  },
  AssetInformation: { icon: Tag, text: "text-chart-4", bg: "bg-chart-4/10" },
  Submodel: { icon: Layers, text: "text-chart-2", bg: "bg-chart-2/10" },
  SubmodelElementCollection: {
    icon: FolderTree,
    text: "text-chart-3",
    bg: "bg-chart-3/10",
  },
  SubmodelElementList: {
    icon: ListTree,
    text: "text-chart-3",
    bg: "bg-chart-3/10",
  },
  Property: { icon: Hash, text: "text-muted-foreground", bg: "bg-muted" },
  MultiLanguageProperty: {
    icon: Languages,
    text: "text-muted-foreground",
    bg: "bg-muted",
  },
  File: { icon: FileText, text: "text-chart-5", bg: "bg-chart-5/10" },
  Blob: { icon: FileText, text: "text-chart-5", bg: "bg-chart-5/10" },
  Range: { icon: Ruler, text: "text-muted-foreground", bg: "bg-muted" },
  ReferenceElement: { icon: Link2, text: "text-chart-4", bg: "bg-chart-4/10" },
  RelationshipElement: {
    icon: Link2,
    text: "text-chart-4",
    bg: "bg-chart-4/10",
  },
  Entity: { icon: Box, text: "text-chart-2", bg: "bg-chart-2/10" },
  Operation: { icon: Workflow, text: "text-chart-4", bg: "bg-chart-4/10" },
  ConceptDescription: { icon: Cpu, text: "text-chart-4", bg: "bg-chart-4/10" },
  Reference: { icon: Link2, text: "text-muted-foreground", bg: "bg-muted" },
  Group: { icon: FolderTree, text: "text-foreground", bg: "bg-muted" },
  Attribute: { icon: Hash, text: "text-muted-foreground", bg: "bg-muted" },
}

export function AasTreeNode({
  node,
  depth,
  defaultOpen,
  selectedId,
  onSelect,
}: {
  node: TreeNode
  depth: number
  defaultOpen?: boolean
  /** When provided, rows are selectable and the matching id is highlighted. */
  selectedId?: string
  onSelect?: (node: TreeNode) => void
}) {
  const hasChildren = !!node.children && node.children.length > 0
  // Expand top levels by default; collapse deep leaves' parents.
  const [open, setOpen] = useState(defaultOpen ?? depth < 2)

  const style = NODE_STYLE[node.type] ?? NODE_STYLE.Attribute
  const Icon = style.icon
  const selectable = !!onSelect
  const isSelected = selectable && selectedId === node.id

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition-colors",
          selectable
            ? "cursor-pointer hover:border-border hover:bg-muted/50"
            : "hover:border-border hover:bg-muted/50",
          isSelected &&
            "border-primary/40 bg-primary/10 hover:border-primary/40 hover:bg-primary/10",
        )}
        style={{ marginLeft: depth * 20 }}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
        aria-selected={selectable ? isSelected : undefined}
        onClick={selectable ? () => onSelect!(node) : undefined}
        onKeyDown={
          selectable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect!(node)
                }
              }
            : undefined
        }
      >
        {depth > 0 && (
          <span
            aria-hidden
            className="absolute -left-2.5 top-0 h-full w-px bg-border/70"
          />
        )}

        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={open ? "접기" : "펼치기"}
            aria-expanded={open}
          >
            <ChevronRight
              className={cn("size-4 transition-transform", open && "rotate-90")}
            />
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}

        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            style.bg,
            style.text,
          )}
        >
          <Icon className="size-3.5" />
        </span>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-medium">{node.label}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
            {node.type}
          </span>
          {node.badge && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {node.badge}
            </Badge>
          )}
          {node.value && (
            <span className="min-w-0 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              {node.value}
            </span>
          )}
        </div>
      </div>

      {hasChildren && open && (
        <div className="flex flex-col gap-0.5 pt-0.5">
          {node.children!.map((child) => (
            <AasTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

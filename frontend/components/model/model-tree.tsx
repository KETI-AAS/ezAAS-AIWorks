"use client"

import { useState } from "react"
import {
  ChevronRight,
  GitBranch,
  Box,
  Layers,
  Rocket,
  Cpu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { TreeNode } from "@/lib/registry-data"

function stageIconFor(stage: string): typeof Box {
  const s = stage.toLowerCase()
  if (s.includes("base")) return Box
  if (s.includes("fine")) return Layers
  if (s.includes("quant") || s.includes("optim")) return Cpu
  if (s.includes("edge") || s.includes("deploy")) return Rocket
  return GitBranch
}

function NodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const Icon = stageIconFor(node.stage)

  return (
    <div className="flex flex-col">
      <div
        className="group relative flex items-start gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50"
        style={{ marginLeft: depth * 24 }}
      >
        {depth > 0 && (
          <span
            aria-hidden
            className="absolute -left-3 top-0 h-full w-px bg-border"
          />
        )}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={cn("size-4 transition-transform", open && "rotate-90")}
            />
          </button>
        ) : (
          <span className="mt-0.5 size-6 shrink-0" />
        )}

        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium leading-none">{node.name}</span>
            <Badge variant="secondary" className="text-xs">
              {node.stage}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {node.framework}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            {node.description}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
            <span>{node.size}</span>
            <span>{node.runtime}</span>
            <span>{node.createdAt}</span>
          </div>
        </div>
      </div>

      {hasChildren && open && (
        <div className="flex flex-col">
          {node.children!.map((child) => (
            <NodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ModelTree({ root }: { root: TreeNode }) {
  return (
    <div className="flex flex-col gap-1">
      <NodeRow node={root} depth={0} />
    </div>
  )
}

"use client"

import { CalendarDays, GitBranch, Network } from "lucide-react"
import { useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { TreeNode } from "@/lib/aas/aas-types"
import type { AasVersion } from "@/lib/aas/aas-version-store"
import { AasPropertyPanel } from "./aas-property-panel"
import { AasTree } from "./aas-tree"

/** Find a node by id within a tree. */
function findNode(node: TreeNode, id: string): TreeNode | null {
  if (node.id === id) return node
  for (const child of node.children ?? []) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

export function AasViewerDialog({
  open,
  onOpenChange,
  title,
  versions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  versions: AasVersion[]
}) {
  const [versionLabel, setVersionLabel] = useState<string>(
    versions[0]?.version ?? "",
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const activeIndex = Math.max(
    0,
    versions.findIndex((v) => v.version === versionLabel),
  )
  const active = versions[activeIndex]
  const isLatest = activeIndex === 0

  const selectedNode = useMemo(() => {
    if (!active) return null
    if (!selectedId) return active.tree
    return findNode(active.tree, selectedId) ?? active.tree
  }, [active, selectedId])

  if (!active) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-5xl gap-0 overflow-hidden p-0"
      >
        {/* Header */}
        <DialogHeader className="gap-3 border-b border-border p-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-primary">
              AAS Structure
            </span>
            <DialogTitle className="flex items-center gap-2">
              <Network className="size-4 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription>
              Asset Administration Shell 구조를 디지털 트윈 탐색기처럼 조회합니다. (읽기 전용)
            </DialogDescription>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <GitBranch className="size-4 text-muted-foreground" />
              <Select
                value={versionLabel}
                onValueChange={(v) => v && setVersionLabel(v)}
              >
                <SelectTrigger size="sm" className="min-w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v, i) => (
                    <SelectItem key={v.version} value={v.version}>
                      {v.version}
                      {i === 0 ? " (Latest)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLatest ? (
                <Badge
                  variant="outline"
                  className="text-emerald-600 dark:text-emerald-400"
                >
                  최신 버전
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                  이전 버전
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              생성일 {active.date || "—"}
            </div>
          </div>
        </DialogHeader>

        {/* Body: tree | property */}
        <div className="grid max-h-[65vh] grid-cols-1 md:grid-cols-[1.3fr_1fr]">
          <div className="max-h-[65vh] overflow-y-auto border-b border-border p-4 md:border-b-0 md:border-r">
            <AasTree
              root={active.tree}
              selectedId={selectedNode?.id}
              onSelect={(node) => setSelectedId(node.id)}
            />
          </div>
          <div className="max-h-[65vh] overflow-y-auto bg-muted/20 p-5">
            <AasPropertyPanel node={selectedNode} editable={false} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

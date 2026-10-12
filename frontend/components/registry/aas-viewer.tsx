"use client"

import { CheckCircle2, FileJson, Network } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { TreeNode } from "@/lib/aas/aas-types"
import { AasTree } from "./aas-tree"

/** Format a byte count into a short human-readable string. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function AasViewer({
  fileName,
  fileSize,
  tree,
}: {
  fileName: string
  fileSize: number
  tree: TreeNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-primary">
          AAS Structure
        </span>
        <h3 className="text-base font-semibold">AAS Viewer</h3>
        <p className="text-sm text-muted-foreground text-pretty">
          업로드한 AAS 파일을 파싱하여 논리적 AAS 계층 구조로 표시합니다.
        </p>
      </div>

      {/* File meta */}
      <div className="flex items-center gap-3 rounded-xl border border-chart-2/40 bg-chart-2/5 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-chart-2/15 text-chart-2">
          <FileJson className="size-5" />
        </span>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-medium">{fileName}</span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(fileSize)}
          </span>
        </div>
        <Badge variant="secondary" className="gap-1.5 text-chart-2">
          <CheckCircle2 className="size-3.5" />
          파싱 완료
        </Badge>
      </div>

      {/* Tree */}
      <Card className="p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Network className="size-4 text-primary" />
          AAS Hierarchy
        </div>
        <AasTree root={tree} />
      </Card>
    </div>
  )
}

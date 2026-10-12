"use client"

import type { TreeNode } from "@/lib/aas/aas-types"
import { AasTreeNode } from "./aas-tree-node"

export function AasTree({
  root,
  selectedId,
  onSelect,
}: {
  root: TreeNode
  /** When provided, rows become selectable and the matching id is highlighted. */
  selectedId?: string
  onSelect?: (node: TreeNode) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <AasTreeNode
        node={root}
        depth={0}
        defaultOpen
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  )
}

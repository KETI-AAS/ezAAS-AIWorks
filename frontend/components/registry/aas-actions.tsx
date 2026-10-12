"use client"

import Link from "next/link"
import { FileEdit, Network } from "lucide-react"
import { useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import type { AasEnvironment } from "@/lib/aas/aas-types"
import { type SeedVersionMeta, useAasVersions } from "@/lib/aas/aas-version-store"
import { parseAasTree } from "@/lib/aas/parse-aas-tree"
import { cn } from "@/lib/utils"
import { AasViewerDialog } from "./aas-viewer-dialog"

export function AasActions({
  entityId,
  entityKind,
  title,
  versionMeta,
  env,
}: {
  entityId: string
  entityKind: "model" | "dataset"
  title: string
  versionMeta: SeedVersionMeta[]
  env: AasEnvironment
}) {
  const versions = useAasVersions(entityId, () => parseAasTree(env), versionMeta)
  const [open, setOpen] = useState(false)

  const editHref = `/${entityKind}s/${entityId}/aas/edit`

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
      >
        <Network data-icon="inline-start" />
        AAS 구조 보기
      </Button>

      <Link
        href={editHref}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-300"
        )}
      >
        <FileEdit data-icon="inline-start" />
        Edit
      </Link>

      <AasViewerDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        versions={versions}
      />
    </>
  )
}

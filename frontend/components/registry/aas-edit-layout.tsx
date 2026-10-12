"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Braces,
  FileEdit,
  GitBranch,
  Network,
  Save,
  X,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import type { AasEnvironment, TreeNode } from "@/lib/aas/aas-types"
import {
  addVersion,
  cloneTree,
  nextVersionLabel,
  type SeedVersionMeta,
  useAasVersions,
} from "@/lib/aas/aas-version-store"
import { parseAasTree } from "@/lib/aas/parse-aas-tree"
import { AasPropertyPanel } from "./aas-property-panel"
import { AasTree } from "./aas-tree"

/** Find a node by id. */
function findNode(node: TreeNode, id: string): TreeNode | null {
  if (node.id === id) return node
  for (const child of node.children ?? []) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

/** Return a new tree with the node matching `id` patched. */
function patchNode(node: TreeNode, id: string, patch: Partial<TreeNode>): TreeNode {
  if (node.id === id) return { ...node, ...patch }
  if (!node.children) return node
  return {
    ...node,
    children: node.children.map((child) => patchNode(child, id, patch)),
  }
}

export function AasEditLayout({
  entityId,
  entityKind,
  title,
  listLabel,
  listHref,
  backHref,
  versionMeta,
  env,
}: {
  entityId: string
  entityKind: "model" | "dataset"
  title: string
  listLabel: string
  listHref: string
  backHref: string
  versionMeta: SeedVersionMeta[]
  env: AasEnvironment
}) {
  const router = useRouter()
  const versions = useAasVersions(entityId, () => parseAasTree(env), versionMeta)

  const [baseVersion, setBaseVersion] = useState(versions[0]?.version ?? "")
  const [tree, setTree] = useState<TreeNode>(() =>
    cloneTree(versions[0]?.tree ?? { id: "root", label: "AAS", type: "Environment" }),
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const baseIsLatest = versions[0]?.version === baseVersion
  const nextLabel = nextVersionLabel(versions[0]?.version ?? "v1.0")

  const selectedNode = useMemo(
    () => (selectedId ? findNode(tree, selectedId) : null),
    [tree, selectedId],
  )

  function switchBaseVersion(label: string) {
    const source = versions.find((v) => v.version === label)
    if (!source) return
    setBaseVersion(label)
    setTree(cloneTree(source.tree))
    setSelectedId(null)
    setDirty(false)
  }

  function handlePatch(patch: Partial<TreeNode>) {
    if (!selectedId) return
    setTree((current) => patchNode(current, selectedId, patch))
    setDirty(true)
  }

  function handleSave() {
    setSaving(true)
    const created = addVersion(entityId, tree, {
      author: "AI팀",
      note: dirty ? "AAS 속성 편집" : `${baseVersion} 기반 새 버전`,
    })
    toast.success(`새 버전 ${created.version}을(를) 저장했습니다`)
    router.push(backHref)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={listHref} />}>{listLabel}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={backHref} />}>{title}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>AAS 모델 수정</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            AAS Model Editor
          </span>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-balance">
            <FileEdit className="size-5 text-primary" />
            AAS 모델 수정
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            {title} · 노드를 선택해 속성을 편집한 뒤 새 버전으로 저장합니다.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">현재 버전</span>
            <div className="flex items-center gap-1.5">
              <GitBranch className="size-4 text-muted-foreground" />
              <Select
                value={baseVersion}
                onValueChange={(v) => v && switchBaseVersion(v)}
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
              {baseIsLatest ? (
                <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">
                  Latest
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                  이전 버전
                </Badge>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setJsonOpen(true)}>
            <Braces data-icon="inline-start" />
            JSON 보기
          </Button>
        </div>
      </div>

      {/* Not-latest warning */}
      {!baseIsLatest && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <GitBranch className="size-4 shrink-0" />
          최신이 아닌 <span className="font-mono">{baseVersion}</span> 버전을 기준으로 편집 중입니다. 저장하면 최신 버전({nextLabel})으로 새로 생성됩니다.
        </div>
      )}

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Network className="size-4 text-primary" />
            AAS Tree
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <AasTree
              root={tree}
              selectedId={selectedNode?.id}
              onSelect={(node) => setSelectedId(node.id)}
            />
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">속성 편집</span>
            {dirty && (
              <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                수정됨
              </Badge>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <AasPropertyPanel node={selectedNode} editable onChange={handlePatch} />
          </div>
        </Card>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">
          저장 시 기존 버전은 유지되고 새 버전 <span className="font-mono">{nextLabel}</span>이(가) 생성됩니다.
        </span>
        <div className="flex items-center gap-2">
          <Link href={backHref} className="contents">
            <Button variant="outline">
              <X data-icon="inline-start" />
              취소
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            <Save data-icon="inline-start" />
            새 버전으로 저장
          </Button>
        </div>
      </div>

      {/* JSON view (read-only) */}
      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-2xl gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Braces className="size-4 text-primary" />
              AAS Tree (JSON)
            </DialogTitle>
            <DialogDescription>
              현재 편집 중인 구조의 읽기 전용 미리보기입니다.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
            {JSON.stringify(tree, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}

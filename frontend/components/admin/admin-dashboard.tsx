"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Boxes,
  Clock,
  Database,
  Eye,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  assetPairs,
  datasets,
  getTaskThumbnail,
  models,
  type TaskType,
} from "@/lib/registry-data"
import { cn } from "@/lib/utils"

type AasType = "AI Dataset" | "AI Model" | "AI Asset Pair"
type AasStatus = "Approved" | "Pending" | "Validation Failed"

interface AasRow {
  id: string
  name: string
  type: AasType
  task: TaskType
  version: string
  author: string
  registeredAt: string
  status: AasStatus
}

/** Deterministic pseudo-status so the sample data has a realistic mix. */
function statusFromRegistry(value: string): AasStatus {
  if (value === "검증 완료") return "Approved"
  if (value === "검증 실패") return "Validation Failed"
  return "Pending"
}

function buildRows(): AasRow[] {
  const datasetRows: AasRow[] = datasets.map((d) => ({
    id: `ds-${d.id}`,
    name: d.name,
    type: "AI Dataset",
    task: d.task,
    version: d.version,
    author: d.traceability.contactPerson,
    registeredAt: d.createdAt,
    status: statusFromRegistry(d.validation.registryStatus),
  }))

  const modelRows: AasRow[] = models.map((m, i) => ({
    id: `ml-${m.id}`,
    name: m.name,
    type: "AI Model",
    task: m.task,
    version: m.version,
    author: m.versions[0]?.author ?? "AI팀",
    registeredAt: m.versions[0]?.date ?? "2024-01-01",
    // Give models a realistic spread of statuses.
    status: i % 3 === 0 ? "Pending" : "Approved",
  }))

  const pairRows: AasRow[] = assetPairs.map((p) => ({
    id: `ap-${p.id}`,
    name: p.title,
    type: "AI Asset Pair",
    task: p.task,
    version: p.version,
    author: p.model.versions[0]?.author ?? "AI팀",
    registeredAt: p.model.versions[0]?.date ?? "2024-01-01",
    status:
      p.validation === "Validated"
        ? "Approved"
        : p.validation === "Unvalidated"
          ? "Validation Failed"
          : "Pending",
  }))

  return [...datasetRows, ...modelRows, ...pairRows]
}

const typeBadgeVariant: Record<AasType, string> = {
  "AI Dataset": "bg-chart-2/10 text-chart-2",
  "AI Model": "bg-primary/10 text-primary",
  "AI Asset Pair": "bg-chart-4/15 text-chart-4",
}

function StatusBadge({ status }: { status: AasStatus }) {
  if (status === "Approved") {
    return (
      <Badge className="gap-1 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        승인 완료
      </Badge>
    )
  }
  if (status === "Pending") {
    return (
      <Badge className="gap-1 bg-amber-500/12 text-amber-600 dark:text-amber-400">
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        검토 대기
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      검증 실패
    </Badge>
  )
}

function SummaryCard({
  icon: Icon,
  title,
  count,
  description,
  accent,
}: {
  icon: typeof Database
  title: string
  count: number
  description: string
  accent?: "warning" | "danger"
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            accent === "warning"
              ? "bg-amber-500/12 text-amber-600 dark:text-amber-400"
              : accent === "danger"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      <span className="text-3xl font-semibold tabular-nums tracking-tight">{count}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
    </div>
  )
}

const typeTabs: { label: string; value: AasType | "All" }[] = [
  { label: "전체", value: "All" },
  { label: "AI Dataset", value: "AI Dataset" },
  { label: "AI Model", value: "AI Model" },
  { label: "AI Asset Pair", value: "AI Asset Pair" },
]

export function AdminDashboard() {
  const rows = useMemo(buildRows, [])
  const [tab, setTab] = useState<AasType | "All">("All")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchesTab = tab === "All" || row.type === tab
      const matchesQuery =
        !query.trim() ||
        row.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        row.author.toLowerCase().includes(query.trim().toLowerCase())
      return matchesTab && matchesQuery
    })
  }, [rows, tab, query])

  const pending = rows.filter((r) => r.status === "Pending").length
  const failed = rows.filter((r) => r.status === "Validation Failed").length

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-8">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-4.5" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Admin</h1>
        </div>
        <p className="text-muted-foreground text-pretty">
          AI Capability Registry Administration
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          icon={Database}
          title="AI Datasets"
          count={datasets.length}
          description="등록된 데이터셋 AAS"
        />
        <SummaryCard
          icon={Boxes}
          title="AI Models"
          count={models.length}
          description="등록된 모델 AAS"
        />
        <SummaryCard
          icon={Link2}
          title="AI Asset Pairs"
          count={assetPairs.length}
          description="데이터셋-모델 연계 자산"
        />
        <SummaryCard
          icon={Clock}
          title="Pending Review"
          count={pending}
          description="검토가 필요한 항목"
          accent="warning"
        />
        <SummaryCard
          icon={AlertTriangle}
          title="Validation Failed"
          count={failed}
          description="검증에 실패한 항목"
          accent="danger"
        />
      </div>

      {/* AAS Management */}
      <section className="mt-10 rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold tracking-tight">AAS Management</h2>
            <p className="text-sm text-muted-foreground">
              등록된 모든 AAS를 검토하고 관리합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64 md:flex-none">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름 또는 작성자 검색"
                className="pl-9"
                aria-label="AAS 검색"
              />
            </div>
            <Button variant="outline" size="icon" aria-label="필터">
              <SlidersHorizontal data-icon="inline-start" />
            </Button>
            <Button>
              <Plus data-icon="inline-start" />
              Register AAS
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-5 pt-4">
          <Tabs value={tab} onValueChange={(v) => v && setTab(v as AasType | "All")}>
            <TabsList>
              {typeTabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Table */}
        <div className="overflow-x-auto p-5">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Version</th>
                <th className="px-3 py-2.5 font-medium">Author</th>
                <th className="px-3 py-2.5 font-medium">Registered</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
                        <Image
                          src={getTaskThumbnail(row.task) || "/placeholder.svg"}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </span>
                      <span className="font-medium text-foreground">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={cn("font-normal", typeBadgeVariant[row.type])}>
                      {row.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 font-mono text-muted-foreground">{row.version}</td>
                  <td className="px-3 py-3 text-muted-foreground">{row.author}</td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {row.registeredAt}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="보기">
                        <Eye data-icon="inline-start" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="편집">
                        <Pencil data-icon="inline-start" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" aria-label="더 보기" />
                          }
                        >
                          <MoreHorizontal data-icon="inline-start" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem>승인</DropdownMenuItem>
                          <DropdownMenuItem>다시 검증</DropdownMenuItem>
                          <DropdownMenuItem>버전 기록</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive">삭제</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
              <p className="text-sm font-medium">검색 결과가 없습니다</p>
              <p className="text-xs text-muted-foreground">
                다른 검색어나 필터를 시도해 보세요.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

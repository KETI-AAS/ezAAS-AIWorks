"use client"

import { ArrowRight, Boxes, Database, Eye, Link2, Search, X } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { StatusTag, type Tone } from "@/components/works/primitives"
import { assetPairs, datasets, models, type TaskType } from "@/lib/registry-data"
import { cn } from "@/lib/utils"
import { useCaseOf } from "@/lib/works/plain"

type AasType = "dataset" | "model" | "pair"
type AasStatus = "passed" | "pending" | "failed"

interface AasRow {
  id: string
  href: string
  name: string
  type: AasType
  task: TaskType
  version: string
  author: string
  registeredAt: string
  status: AasStatus
  statusSource: string
}

function datasetStatus(value: string): AasStatus {
  if (value === "검증 완료") return "passed"
  if (value === "검증 실패") return "failed"
  return "pending"
}

function buildRows(): AasRow[] {
  const datasetRows: AasRow[] = datasets.map((d) => ({
    id: `ds-${d.id}`,
    href: `/datasets/${d.id}`,
    name: d.name,
    type: "dataset",
    task: d.task,
    version: d.version,
    author: d.traceability.contactPerson,
    registeredAt: d.createdAt,
    status: datasetStatus(d.validation.registryStatus),
    statusSource: `registryStatus: ${d.validation.registryStatus}`,
  }))
  // Models have no status field in the registry; the previous admin derived it by index.
  const modelRows: AasRow[] = models.map((m, i) => ({
    id: `ml-${m.id}`,
    href: `/models/${m.id}`,
    name: m.name,
    type: "model",
    task: m.task,
    version: m.version,
    author: m.versions[0]?.author ?? "AI팀",
    registeredAt: m.versions[0]?.date ?? "2024-01-01",
    status: i % 3 === 0 ? "pending" : "passed",
    statusSource: "데모 값 (레지스트리에 모델 상태 필드 없음)",
  }))
  const pairRows: AasRow[] = assetPairs.map((p) => ({
    id: `ap-${p.id}`,
    href: `/pairs/${p.id}`,
    name: p.title,
    type: "pair",
    task: p.task,
    version: p.version,
    author: p.model.versions[0]?.author ?? "AI팀",
    registeredAt: p.model.versions[0]?.date ?? "2024-01-01",
    status: p.validation === "Validated" ? "passed" : p.validation === "Unvalidated" ? "failed" : "pending",
    statusSource: `validation: ${p.validation}`,
  }))
  return [...datasetRows, ...modelRows, ...pairRows]
}

const TYPE_META: Record<AasType, { label: string; icon: typeof Boxes }> = {
  dataset: { label: "AI 데이터셋", icon: Database },
  model: { label: "AI 모델", icon: Boxes },
  pair: { label: "모델·데이터 짝", icon: Link2 },
}

const STATUS_META: Record<AasStatus, { label: string; tone: Tone }> = {
  passed: { label: "검증 완료", tone: "success" },
  pending: { label: "검토 대기", tone: "warning" },
  failed: { label: "검증 실패", tone: "danger" },
}

type SortKey = "attention" | "registered" | "name"

const STATUS_RANK: Record<AasStatus, number> = { failed: 0, pending: 1, passed: 2 }

/** Controls shown in the old admin screen that have no handler or API yet. */
const NOT_IMPLEMENTED = ["AAS 등록", "편집", "승인", "다시 검증", "버전 기록", "삭제"]

export function AdminDashboard() {
  const rows = useMemo(buildRows, [])
  const [type, setType] = useState<AasType | "all">("all")
  const [status, setStatus] = useState<AasStatus | "all">("all")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("attention")

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    const out = rows.filter(
      (r) =>
        (type === "all" || r.type === type) &&
        (status === "all" || r.status === status) &&
        (!q || r.name.toLowerCase().includes(q) || r.author.toLowerCase().includes(q)),
    )
    return out.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "ko")
        : sort === "registered"
          ? b.registeredAt.localeCompare(a.registeredAt)
          : STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.registeredAt.localeCompare(a.registeredAt),
    )
  }, [rows, type, status, q, sort])

  const count = (s: AasStatus) => rows.filter((r) => r.status === s).length
  const attention = rows.filter((r) => r.status !== "passed").sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])
  const anyFilter = type !== "all" || status !== "all" || q

  const reset = () => {
    setType("all")
    setStatus("all")
    setQuery("")
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-[15px] font-medium text-primary">관리</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">AI 자산 관리</h1>
        <p className="text-lg text-muted-foreground">등록된 데이터셋·모델·짝의 검증 상태를 살펴보고, 확인이 필요한 항목부터 처리해요.</p>
      </header>

      <section aria-label="현황" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="grid grid-cols-3 gap-3">
          {(["failed", "pending", "passed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(status === s ? "all" : s)}
              aria-pressed={status === s}
              className={cn(
                "flex flex-col items-start gap-2 rounded-2xl bg-card p-5 text-left ring-1 transition",
                status === s ? "ring-2 ring-primary" : "ring-border hover:ring-foreground/30",
              )}
            >
              <StatusTag tone={STATUS_META[s].tone}>{STATUS_META[s].label}</StatusTag>
              <span className="text-4xl font-bold tabular-nums">{count(s)}</span>
              <span className="text-sm text-muted-foreground">{status === s ? "필터 적용 중" : "눌러서 이것만 보기"}</span>
            </button>
          ))}
          <dl className="col-span-3 flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-muted/50 px-4 py-3 text-sm">
            {(Object.keys(TYPE_META) as AasType[]).map((t) => (
              <div key={t} className="flex gap-1.5">
                <dt className="text-muted-foreground">{TYPE_META[t].label}</dt>
                <dd className="font-semibold tabular-nums">{rows.filter((r) => r.type === t).length}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="text-lg font-semibold">
            확인이 필요해요 <span className="tabular-nums text-muted-foreground">{attention.length}</span>
          </h2>
          {attention.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {attention.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="group flex items-center gap-3 py-2.5">
                    <StatusTag tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</StatusTag>
                    <span className="min-w-0 flex-1 truncate font-medium group-hover:underline">{r.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">{TYPE_META[r.type].label}</span>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-muted-foreground">모든 자산이 검증을 통과했어요.</p>
          )}
          {attention.length > 5 ? (
            <button type="button" onClick={() => setSort("attention")} className="self-start text-sm font-medium text-primary hover:underline">
              아래 목록에서 모두 보기
            </button>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="list-title" className="flex flex-col rounded-2xl bg-card ring-1 ring-border">
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 id="list-title" className="text-lg font-semibold">
              전체 자산
            </h2>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {filtered.length}개 / 전체 {rows.length}개
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="자산 종류" className="flex gap-1 rounded-lg bg-muted p-1">
              {(["all", "dataset", "model", "pair"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={type === t}
                  onClick={() => setType(t)}
                  className={cn("rounded-md px-3 py-1.5 text-sm font-medium", type === t ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  {t === "all" ? "전체" : TYPE_META[t].label}
                </button>
              ))}
            </div>
            <label className="relative">
              <span className="sr-only">이름 또는 담당자 검색</span>
              <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름 또는 담당자"
                className="h-10 w-56 rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">정렬</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-10 rounded-lg border border-input bg-background px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="attention">확인 필요 먼저</option>
                <option value="registered">최근 등록순</option>
                <option value="name">이름순</option>
              </select>
            </label>
            {anyFilter ? (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-primary hover:underline">
                <X aria-hidden className="size-3.5" /> 조건 지우기
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">이름</th>
                <th scope="col" className="px-3 py-3 font-medium">종류</th>
                <th scope="col" className="px-3 py-3 font-medium">버전</th>
                <th scope="col" className="px-3 py-3 font-medium">담당자</th>
                <th scope="col" className="px-3 py-3 font-medium">등록일</th>
                <th scope="col" className="px-3 py-3 font-medium">상태</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const Icon = TYPE_META[r.type].icon
                return (
                  <tr key={r.id} className={cn("border-t border-border", r.status === "failed" && "bg-destructive/5")}>
                    <td className="px-5 py-3">
                      <span className="flex flex-col">
                        <span className="text-[15px] font-semibold">{r.name}</span>
                        <span className="text-xs text-muted-foreground">{useCaseOf(r.task).problem}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon aria-hidden className="size-4 text-muted-foreground" /> {TYPE_META[r.type].label}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-muted-foreground">{r.version}</td>
                    <td className="px-3 py-3">{r.author}</td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">{r.registeredAt}</td>
                    <td className="px-3 py-3">
                      <span className="flex flex-col items-start gap-1">
                        <StatusTag tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</StatusTag>
                        <span className="text-xs text-muted-foreground">{r.statusSource}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={r.href}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                      >
                        <Eye aria-hidden className="size-4" /> 상세 보기
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="font-semibold">조건에 맞는 자산이 없어요</p>
              <button type="button" onClick={reset} className="text-sm font-medium text-primary hover:underline">
                조건 지우기
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-border p-5 md:flex-row md:items-center md:gap-4">
          <span className="text-sm font-semibold">아직 연결되지 않은 작업</span>
          <ul className="flex flex-wrap gap-2" aria-label="미구현 작업">
            {NOT_IMPLEMENTED.map((a) => (
              <li key={a}>
                <button
                  type="button"
                  disabled
                  title="서버 기능이 아직 없어 사용할 수 없어요"
                  className="cursor-not-allowed rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
                >
                  {a}
                </button>
              </li>
            ))}
          </ul>
          <span className="text-sm text-muted-foreground md:ml-auto">이전 화면에 버튼만 있던 기능이에요. API가 연결되면 행별 작업으로 옮겨요.</span>
        </div>
      </section>
    </div>
  )
}

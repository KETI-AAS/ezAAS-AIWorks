"use client"

import { ArrowRight, Search, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"

import { InputOutput, StatusTag } from "@/components/works/primitives"
import { assetPairs, datasets, getDataset, getModel, getModelsByDataset, models, type TaskType } from "@/lib/registry-data"
import { cn } from "@/lib/utils"
import { TASK_KO, useCaseOf } from "@/lib/works/plain"

type Mode = "models" | "datasets" | "pairs"

const MODES: { id: Mode; label: string; href: string; hint: string }[] = [
  { id: "models", label: "AI 모델", href: "/models", hint: "문제를 풀어 주는 AI" },
  { id: "pairs", label: "모델 + 데이터 짝", href: "/pairs", hint: "어떤 데이터로 배운 AI인지" },
  { id: "datasets", label: "학습 데이터", href: "/datasets", hint: "AI가 배운 자료" },
]

const PAGE_SIZE = 8

type Row = {
  id: string
  search: string
  facets: Record<FacetKey, string>
  sortName: string
}

type FacetKey = "task" | "dataType" | "industry" | "framework"

const FACETS: { key: FacetKey; label: string; modes: Mode[] }[] = [
  { key: "task", label: "풀고 싶은 문제", modes: ["models", "datasets", "pairs"] },
  { key: "dataType", label: "데이터 종류", modes: ["models", "datasets", "pairs"] },
  { key: "industry", label: "산업", modes: ["models", "datasets", "pairs"] },
  { key: "framework", label: "프레임워크", modes: ["models", "pairs"] },
]

const optionLabel = (key: FacetKey, value: string) => (key === "task" ? useCaseOf(value as TaskType).problem : value)

function buildRows(mode: Mode): Row[] {
  if (mode === "models") {
    return models.map((m) => ({
      id: m.id,
      sortName: m.name,
      search: [m.name, m.purpose, m.description, ...m.tags].join(" ").toLowerCase(),
      facets: { task: m.task, dataType: m.dataType, industry: m.industry, framework: m.framework },
    }))
  }
  if (mode === "datasets") {
    return datasets.map((d) => ({
      id: d.id,
      sortName: d.name,
      search: [d.name, d.description, ...d.tags].join(" ").toLowerCase(),
      facets: { task: d.task, dataType: d.dataType, industry: d.industry, framework: "" },
    }))
  }
  return assetPairs.map((p) => {
    const m = getModel(p.model.id)
    return {
      id: p.id,
      sortName: p.model.name,
      search: [p.model.name, p.dataset.name, p.description].join(" ").toLowerCase(),
      facets: { task: p.task, dataType: m?.dataType ?? "", industry: m?.industry ?? "", framework: m?.framework ?? "" },
    }
  })
}

type Selection = Partial<Record<FacetKey, string[]>>

function matchesSelection(row: Row, sel: Selection, skip?: FacetKey) {
  return (Object.keys(sel) as FacetKey[]).every((k) => k === skip || !sel[k]?.length || sel[k]!.includes(row.facets[k]))
}

export function Explore({ mode, initialTask }: { mode: Mode; initialTask?: TaskType | null }) {
  const [selection, setSelection] = useState<Selection>(initialTask ? { task: [initialTask] } : {})
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<"name" | "default">("default")
  const [visible, setVisible] = useState(PAGE_SIZE)

  const all = useMemo(() => buildRows(mode), [mode])
  const facets = FACETS.filter((f) => f.modes.includes(mode))
  const q = query.trim().toLowerCase()
  const textMatch = (r: Row) => !q || r.search.includes(q)

  const rows = useMemo(() => {
    const out = all.filter((r) => textMatch(r) && matchesSelection(r, selection))
    return sort === "name" ? [...out].sort((a, b) => a.sortName.localeCompare(b.sortName, "ko")) : out
    // eslint-disable-next-line react-hooks/exhaustive-deps -- textMatch derives from q
  }, [all, selection, q, sort])

  const options = (key: FacetKey) => {
    const counts = new Map<string, number>()
    for (const r of all) {
      const v = r.facets[key]
      if (!v) continue
      if (!counts.has(v)) counts.set(v, 0)
      if (textMatch(r) && matchesSelection(r, selection, key)) counts.set(v, counts.get(v)! + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
  }

  const toggle = (key: FacetKey, value: string) => {
    setVisible(PAGE_SIZE)
    setSelection((prev) => {
      const cur = prev[key] ?? []
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...prev, [key]: next }
    })
  }

  const active = (Object.entries(selection) as [FacetKey, string[]][]).flatMap(([k, vs]) => vs.map((v) => ({ k, v })))
  const clearAll = () => {
    setSelection({})
    setQuery("")
    setVisible(PAGE_SIZE)
  }
  const taskParam = selection.task?.length === 1 ? `?task=${encodeURIComponent(selection.task[0])}` : ""
  const shown = rows.slice(0, visible)

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">AI 찾아보기</h1>
          <p className="text-lg text-muted-foreground">하고 싶은 일로 좁히거나, 이름으로 찾아보세요.</p>
        </div>
        <nav aria-label="찾아볼 대상" className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {MODES.map((m) => (
            <Link
              key={m.id}
              href={`${m.href}${taskParam}`}
              aria-current={mode === m.id ? "page" : undefined}
              className={cn("flex flex-col rounded-lg px-4 py-2 text-left", mode === m.id ? "bg-foreground text-background" : "text-foreground hover:bg-muted")}
            >
              <span className="text-[15px] font-semibold">{m.label}</span>
              <span className={cn("text-xs", mode === m.id ? "text-background/70" : "text-muted-foreground")}>{m.hint}</span>
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside aria-label="필터" className="flex flex-col gap-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <label className="relative">
            <span className="sr-only">이름이나 용도로 검색</span>
            <Search aria-hidden className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setVisible(PAGE_SIZE)
              }}
              placeholder="예: 스크래치, 문서, 진동"
              className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          {facets.map((f) => {
            const opts = options(f.key)
            if (opts.length < 2) return null
            return (
              <fieldset key={f.key} className="flex flex-col gap-1">
                <legend className="mb-2 text-sm font-semibold text-muted-foreground">{f.label}</legend>
                {opts.map(([value, count]) => {
                  const checked = selection[f.key]?.includes(value) ?? false
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px]",
                        checked ? "bg-secondary text-primary" : "hover:bg-card",
                        count === 0 && !checked && "text-muted-foreground",
                      )}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(f.key, value)} className="size-4 accent-[var(--primary)]" />
                      <span className="flex-1">{optionLabel(f.key, value)}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
                    </label>
                  )
                })}
              </fieldset>
            )
          })}
        </aside>

        <section aria-labelledby="result-count" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p id="result-count" aria-live="polite" className="text-[15px]">
              <strong className="font-semibold">{rows.length}개</strong>
              <span className="text-muted-foreground"> / 전체 {all.length}개</span>
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">정렬</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="h-9 rounded-lg border border-input bg-card px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="default">추천순</option>
                <option value="name">이름순</option>
              </select>
            </label>
          </div>

          {active.length || q ? (
            <ul aria-label="적용한 조건" className="flex flex-wrap items-center gap-2">
              {q ? (
                <li>
                  <button type="button" onClick={() => setQuery("")} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background">
                    {`"${query.trim()}"`} <X aria-hidden className="size-3.5" />
                    <span className="sr-only">검색어 지우기</span>
                  </button>
                </li>
              ) : null}
              {active.map(({ k, v }) => (
                <li key={`${k}:${v}`}>
                  <button type="button" onClick={() => toggle(k, v)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background">
                    {optionLabel(k, v)} <X aria-hidden className="size-3.5" />
                    <span className="sr-only">조건 빼기</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={clearAll} className="px-2 text-sm font-medium text-primary hover:underline">
                  모두 지우기
                </button>
              </li>
            </ul>
          ) : null}

          {rows.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-10">
              <p className="text-lg font-semibold">조건에 맞는 항목이 없어요</p>
              <p className="text-[15px] text-muted-foreground">조건을 하나씩 빼 보거나 모두 지워 보세요.</p>
              <button type="button" onClick={clearAll} className="rounded-lg border border-border px-4 py-2 text-[15px] font-medium hover:bg-muted">
                조건 초기화
              </button>
            </div>
          ) : null}

          <ul className="flex flex-col gap-3">
            {shown.map((r) => (
              <li key={r.id}>
                {mode === "models" ? <ModelRow id={r.id} /> : mode === "datasets" ? <DatasetRow id={r.id} /> : <PairRow id={r.id} />}
              </li>
            ))}
          </ul>

          {rows.length > visible ? (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="self-center rounded-lg border border-border bg-card px-5 py-3 text-[15px] font-semibold hover:bg-muted"
            >
              {Math.min(PAGE_SIZE, rows.length - visible)}개 더 보기 ({visible}/{rows.length})
            </button>
          ) : rows.length > PAGE_SIZE ? (
            <p className="text-center text-sm text-muted-foreground">모두 봤어요</p>
          ) : null}
        </section>
      </div>
    </div>
  )
}

function ModelRow({ id }: { id: string }) {
  const m = getModel(id)!
  return (
    <article className="grid gap-5 rounded-2xl border border-border bg-card p-4 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center">
      <Link href={`/models/${m.id}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted" tabIndex={-1}>
        <Image src={m.image || "/placeholder.svg"} alt="" fill sizes="160px" className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-primary">{useCaseOf(m.task).problem}</span> · {m.dataType} · {m.industry} · {m.framework}
        </p>
        <h2 className="text-xl font-semibold tracking-tight">
          <Link href={`/models/${m.id}`} className="hover:underline">
            {m.name}
          </Link>
        </h2>
        <InputOutput input={m.input} output={m.output} />
      </div>
      <div className="flex gap-2 md:flex-col md:items-stretch">
        <StatusTag tone="success" className="self-start md:self-end">
          바로 해볼 수 있어요
        </StatusTag>
        <Link
          href={`/models/${m.id}/deploy`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          추론 해보기 <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </article>
  )
}

function DatasetRow({ id }: { id: string }) {
  const d = getDataset(id)!
  const users = getModelsByDataset(d.id)
  return (
    <article className="grid gap-5 rounded-2xl border border-border bg-card p-4 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
      <Link href={`/datasets/${d.id}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted" tabIndex={-1}>
        <Image src={d.image || "/placeholder.svg"} alt="" fill sizes="160px" className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-primary">{TASK_KO[d.task]}용</span> · {d.dataType} · {d.totalSamples}건 · {d.industry}
        </p>
        <h2 className="text-xl font-semibold tracking-tight">
          <Link href={`/datasets/${d.id}`} className="hover:underline">
            {d.name}
          </Link>
        </h2>
        <p className="line-clamp-2 text-[15px] leading-relaxed text-muted-foreground">{d.description}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">이 데이터로 배운 AI:</span>
          {users.length
            ? users.map((u) => (
                <Link key={u.id} href={`/models/${u.id}`} className="rounded-md bg-secondary px-2 py-0.5 font-medium text-primary hover:underline">
                  {u.name}
                </Link>
              ))
            : "아직 없음"}
        </p>
      </div>
    </article>
  )
}

function PairRow({ id }: { id: string }) {
  const p = assetPairs.find((x) => x.id === id)!
  return (
    <Link
      href={`/pairs/${p.id}`}
      className="group grid items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md md:grid-cols-[1fr_auto_1fr_auto]"
    >
      <div className="flex items-center gap-4">
        <Image src={p.dataset.image || "/placeholder.svg"} alt="" width={64} height={64} className="size-14 rounded-lg object-cover" />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm text-muted-foreground">이 데이터로 배워서</span>
          <span className="font-semibold">{p.dataset.name}</span>
        </div>
      </div>
      <ArrowRight aria-hidden className="size-5 text-muted-foreground max-md:rotate-90" />
      <div className="flex items-center gap-4">
        <Image src={p.model.image || "/placeholder.svg"} alt="" width={64} height={64} className="size-14 rounded-lg object-cover" />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm text-muted-foreground">이 일을 해요</span>
          <span className="font-semibold">{p.model.name}</span>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-[15px] font-semibold text-primary group-hover:underline">
        관계 보기 <ArrowRight aria-hidden className="size-4" />
      </span>
    </Link>
  )
}

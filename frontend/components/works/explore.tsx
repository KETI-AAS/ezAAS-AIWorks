"use client"

import { ArrowRight, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"

import { InputOutput, StatusTag } from "@/components/works/primitives"
import { assetPairs, datasets, getDataset, getModelsByDataset, models, type TaskType } from "@/lib/registry-data"
import { cn } from "@/lib/utils"
import { TASK_KO, USE_CASES, useCaseOf } from "@/lib/works/plain"

type Mode = "models" | "datasets" | "pairs"

const MODES: { id: Mode; label: string; href: string; hint: string }[] = [
  { id: "models", label: "AI 모델", href: "/models", hint: "문제를 풀어 주는 AI" },
  { id: "pairs", label: "모델 + 데이터 짝", href: "/pairs", hint: "어떤 데이터로 배운 AI인지" },
  { id: "datasets", label: "학습 데이터", href: "/datasets", hint: "AI가 배운 자료" },
]

function matches(q: string, ...fields: string[]) {
  if (!q) return true
  const needle = q.trim().toLowerCase()
  return fields.some((f) => f.toLowerCase().includes(needle))
}

export function Explore({ mode, initialTask }: { mode: Mode; initialTask?: TaskType | null }) {
  const [task, setTask] = useState<TaskType | null>(initialTask ?? null)
  const [query, setQuery] = useState("")

  const modelRows = useMemo(
    () => models.filter((m) => (!task || m.task === task) && matches(query, m.name, m.purpose, m.description, ...m.tags)),
    [task, query],
  )
  const datasetRows = useMemo(
    () => datasets.filter((d) => (!task || d.task === task) && matches(query, d.name, d.description, ...d.tags)),
    [task, query],
  )
  const pairRows = useMemo(
    () => assetPairs.filter((p) => (!task || p.task === task) && matches(query, p.model.name, p.dataset.name, p.description)),
    [task, query],
  )
  const count = mode === "models" ? modelRows.length : mode === "datasets" ? datasetRows.length : pairRows.length

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">AI 찾아보기</h1>
          <p className="text-lg text-muted-foreground">하고 싶은 일로 고르거나, 이름으로 찾아보세요.</p>
        </div>
        <nav aria-label="찾아볼 대상" className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {MODES.map((m) => (
            <Link
              key={m.id}
              href={task ? `${m.href}?task=${encodeURIComponent(task)}` : m.href}
              aria-current={mode === m.id ? "page" : undefined}
              className={cn(
                "flex flex-col rounded-lg px-4 py-2 text-left",
                mode === m.id ? "bg-foreground text-background" : "text-foreground hover:bg-muted",
              )}
            >
              <span className="text-[15px] font-semibold">{m.label}</span>
              <span className={cn("text-xs", mode === m.id ? "text-background/70" : "text-muted-foreground")}>{m.hint}</span>
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <label className="relative">
            <span className="sr-only">이름이나 용도로 검색</span>
            <Search aria-hidden className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 스크래치, 문서, 진동"
              className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[15px] font-semibold">어떤 문제를 풀고 싶나요?</legend>
            <button
              type="button"
              onClick={() => setTask(null)}
              aria-pressed={task === null}
              className={cn(
                "rounded-xl px-4 py-3 text-left text-[15px] font-medium",
                task === null ? "bg-secondary text-primary" : "hover:bg-card",
              )}
            >
              전체 보기
            </button>
            {USE_CASES.map((u) => (
              <button
                key={u.task}
                type="button"
                onClick={() => setTask(u.task)}
                aria-pressed={task === u.task}
                className={cn(
                  "flex flex-col gap-0.5 rounded-xl px-4 py-3 text-left",
                  task === u.task ? "bg-secondary text-primary" : "hover:bg-card",
                )}
              >
                <span className="text-[15px] font-medium">{u.problem}</span>
                <span className={cn("text-sm", task === u.task ? "text-primary/80" : "text-muted-foreground")}>
                  {u.inputKind} → {u.outputKind}
                </span>
              </button>
            ))}
          </fieldset>
        </aside>

        <section aria-live="polite" className="flex flex-col gap-4">
          <p className="text-[15px] text-muted-foreground">
            {task ? <strong className="font-semibold text-foreground">{useCaseOf(task).problem}</strong> : "전체"}
            {` · ${count}개`}
          </p>

          {count === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-10">
              <p className="text-lg font-semibold">조건에 맞는 항목이 없어요</p>
              <p className="text-[15px] text-muted-foreground">검색어를 지우거나 다른 문제를 골라 보세요.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  setTask(null)
                }}
                className="rounded-lg border border-border px-4 py-2 text-[15px] font-medium hover:bg-muted"
              >
                조건 초기화
              </button>
            </div>
          ) : null}

          {mode === "models" &&
            modelRows.map((m) => {
              const uc = useCaseOf(m.task)
              return (
                <article
                  key={m.id}
                  className="grid gap-5 rounded-2xl border border-border bg-card p-5 md:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_auto]"
                >
                  <Link href={`/models/${m.id}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                    <Image src={m.image || "/placeholder.svg"} alt="" fill sizes="220px" className="object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-primary">{uc.problem}</span>
                      <span className="text-sm text-muted-foreground">· {m.industry}</span>
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      <Link href={`/models/${m.id}`} className="hover:underline">
                        {m.name}
                      </Link>
                    </h2>
                    <p className="text-[15px] leading-relaxed text-muted-foreground text-pretty">{m.purpose}</p>
                    <InputOutput input={m.input} output={m.output} />
                  </div>
                  <div className="flex flex-row items-center gap-3 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-end xl:justify-between">
                    <StatusTag tone="success">바로 해볼 수 있어요</StatusTag>
                    <div className="flex gap-2 xl:flex-col">
                      <Link
                        href={`/models/${m.id}/deploy`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        추론 해보기 <ArrowRight aria-hidden className="size-4" />
                      </Link>
                      <Link
                        href={`/models/${m.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-[15px] font-medium hover:bg-muted"
                      >
                        자세히
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}

          {mode === "datasets" &&
            datasetRows.map((d) => {
              const users = getModelsByDataset(d.id)
              return (
                <article key={d.id} className="grid gap-5 rounded-2xl border border-border bg-card p-5 md:grid-cols-[220px_1fr]">
                  <Link href={`/datasets/${d.id}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                    <Image src={d.image || "/placeholder.svg"} alt="" fill sizes="220px" className="object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-col gap-3">
                    <span className="text-sm font-medium text-primary">
                      {d.dataType} · {d.totalSamples}건 · {TASK_KO[d.task]}용
                    </span>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      <Link href={`/datasets/${d.id}`} className="hover:underline">
                        {d.name}
                      </Link>
                    </h2>
                    <p className="text-[15px] leading-relaxed text-muted-foreground">{d.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[15px]">
                      <span className="text-muted-foreground">이 데이터로 배운 AI:</span>
                      {users.length ? (
                        users.map((u) => (
                          <Link key={u.id} href={`/models/${u.id}`} className="rounded-md bg-secondary px-2.5 py-1 font-medium text-primary hover:underline">
                            {u.name}
                          </Link>
                        ))
                      ) : (
                        <span>아직 없음</span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}

          {mode === "pairs" &&
            pairRows.map((p) => (
              <Link
                key={p.id}
                href={`/pairs/${p.id}`}
                className="group grid items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md md:grid-cols-[1fr_auto_1fr_auto]"
              >
                <div className="flex items-center gap-4">
                  <Image src={p.dataset.image || "/placeholder.svg"} alt="" width={72} height={72} className="size-16 rounded-lg object-cover" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm text-muted-foreground">이 데이터로 배워서</span>
                    <span className="text-lg font-semibold">{p.dataset.name}</span>
                    <span className="text-sm text-muted-foreground">{getDataset(p.dataset.id)?.totalSamples}건</span>
                  </div>
                </div>
                <ArrowRight aria-hidden className="size-6 text-muted-foreground max-md:rotate-90 max-md:justify-self-center" />
                <div className="flex items-center gap-4">
                  <Image src={p.model.image || "/placeholder.svg"} alt="" width={72} height={72} className="size-16 rounded-lg object-cover" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm text-muted-foreground">이 일을 해요</span>
                    <span className="text-lg font-semibold">{p.model.name}</span>
                    <span className="text-sm text-muted-foreground">{useCaseOf(p.model.task).problem}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[15px] font-semibold text-primary group-hover:underline">
                  관계 보기 <ArrowRight aria-hidden className="size-4" />
                </span>
              </Link>
            ))}
        </section>
      </div>
    </div>
  )
}

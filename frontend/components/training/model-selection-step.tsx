"use client"

import { ArrowRight, Check, Database, Search, Target } from "lucide-react"
import Image from "next/image"
import { useMemo, useState } from "react"

import { TaskBadge } from "@/components/registry/task-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { primaryMetric } from "@/lib/training-data"
import { getDataset, getTaskThumbnail, models, type Model } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

const ALL = "전체"

export function ModelSelectionStep({
  selectedModelId,
  onSelect,
  onNext,
}: {
  selectedModelId: string | null
  onSelect: (id: string) => void
  onNext: () => void
}) {
  const [query, setQuery] = useState("")
  const [task, setTask] = useState<string>(ALL)
  const [framework, setFramework] = useState<string>(ALL)

  const tasks = useMemo(
    () => [ALL, ...Array.from(new Set(models.map((m) => m.task)))],
    [],
  )
  const frameworks = useMemo(
    () => [ALL, ...Array.from(new Set(models.map((m) => m.framework)))],
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return models.filter((m) => {
      const matchesQuery =
        q.length === 0 ||
        `${m.name} ${m.task} ${m.framework} ${m.tags.join(" ")}`
          .toLowerCase()
          .includes(q)
      const matchesTask = task === ALL || m.task === task
      const matchesFramework = framework === ALL || m.framework === framework
      return matchesQuery && matchesTask && matchesFramework
    })
  }, [query, task, framework])

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 py-2">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            1
          </span>
          <div>
            <h2 className="text-lg font-semibold">AI Model 선택</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              추가 학습에 사용할 등록된 모델을 선택하세요.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="모델명, 태스크, 키워드 검색"
              className="pl-9"
            />
          </div>
          <Select value={task} onValueChange={(v) => setTask(v ?? ALL)}>
            <SelectTrigger className="h-9 w-full sm:w-40">
              <SelectValue placeholder="태스크 전체" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === ALL ? "태스크 전체" : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={framework} onValueChange={(v) => setFramework(v ?? ALL)}>
            <SelectTrigger className="h-9 w-full sm:w-40">
              <SelectValue placeholder="프레임워크 전체" />
            </SelectTrigger>
            <SelectContent>
              {frameworks.map((f) => (
                <SelectItem key={f} value={f}>
                  {f === ALL ? "프레임워크 전체" : f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
            <p className="text-sm font-medium">검색 결과가 없습니다</p>
            <p className="text-xs text-muted-foreground">
              검색어나 필터를 변경해 보세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((model) => (
              <SelectableModelCard
                key={model.id}
                model={model}
                selected={selectedModelId === model.id}
                onSelect={() => onSelect(model.id)}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end border-t border-border pt-5">
          <Button onClick={onNext} disabled={!selectedModelId}>
            선택한 모델로 진행하기
            <ArrowRight />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SelectableModelCard({
  model,
  selected,
  onSelect,
}: {
  model: Model
  selected: boolean
  onSelect: () => void
}) {
  const dataset = getDataset(model.datasetId)
  const metric = primaryMetric(model)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-all duration-200",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:-translate-y-0.5 hover:shadow-md hover:shadow-foreground/5",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          src={getTaskThumbnail(model.task) || "/placeholder.svg"}
          alt={`${model.name} 대표 이미지`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <TaskBadge
            task={model.task}
            className="bg-background/90 text-foreground backdrop-blur-sm"
          />
        </div>
        {selected && (
          <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="size-4" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="min-w-0 truncate font-heading text-base font-semibold leading-snug"
            title={model.name}
          >
            {model.name}
          </h3>
          <Badge variant="outline" className="shrink-0 font-mono">
            {model.version}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="font-mono text-xs">
            {model.framework}
          </Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Target className="size-3.5 text-primary" />
            {metric.label}
            <span className="font-mono font-semibold text-foreground">
              {metric.value}
            </span>
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {model.description}
        </p>
        <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <Database className="size-3.5" />
          <span className="truncate">{dataset?.name ?? "—"}</span>
        </div>
      </div>
    </button>
  )
}

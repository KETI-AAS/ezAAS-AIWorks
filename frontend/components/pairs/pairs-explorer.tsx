"use client"

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
import { useMemo, useState } from "react"

import { PairCard } from "@/components/pairs/pair-card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { assetPairs, dataTypes, industries, taskTypes } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

type SortKey = "latest" | "downloads" | "performance" | "used"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "downloads", label: "다운로드순" },
  { key: "performance", label: "성능순" },
  { key: "used", label: "사용량순" },
]

export function PairsExplorer() {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("latest")
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([])
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])

  const reset = () => {
    setSelectedIndustries([])
    setSelectedDataTypes([])
    setSelectedTasks([])
    setQuery("")
  }

  const validatedCount = useMemo(
    () => assetPairs.filter((p) => p.validation === "Validated").length,
    [],
  )
  const downloadableCount = useMemo(() => assetPairs.filter((p) => p.downloadable).length, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = assetPairs.filter((p) => {
      if (q) {
        const hay = `${p.title} ${p.description} ${p.task} ${p.framework} ${p.tags.join(" ")}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (selectedIndustries.length && !selectedIndustries.includes(p.model.industry)) return false
      if (selectedDataTypes.length && !selectedDataTypes.includes(p.model.dataType)) return false
      if (selectedTasks.length && !selectedTasks.includes(p.task)) return false
      return true
    })

    const sorted = [...result]
    switch (sort) {
      case "downloads":
        sorted.sort((a, b) => b.downloads - a.downloads)
        break
      case "performance":
        sorted.sort((a, b) => Number(b.metric.value) - Number(a.metric.value))
        break
      case "used":
        sorted.sort((a, b) => b.stars - a.stars)
        break
      default:
        break
    }
    return sorted
  }, [query, sort, selectedIndustries, selectedDataTypes, selectedTasks])

  const hasFilters =
    query.length > 0 ||
    selectedIndustries.length > 0 ||
    selectedDataTypes.length > 0 ||
    selectedTasks.length > 0

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="border-b border-border bg-muted/30 px-4 py-8 md:px-8 md:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">AI Asset Pairs</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">
              표준화된 데이터셋–모델 페어를 살펴보세요. 각 페어는 하나의 AI 데이터셋과 하나의 AI 모델을
              AAS 메타데이터로 연결하며, 검증된 학습 이력을 함께 제공합니다.
            </p>
          </div>

          <div className="relative max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="페어를 이름, Task, 프레임워크, 태그로 검색하세요"
              className="h-11 rounded-xl pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <StatChip label="전체 페어" value={assetPairs.length} />
            <StatChip label="검증 완료" value={validatedCount} />
            <StatChip label="다운로드 가능" value={downloadableCount} />
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
        {/* Filter toolbar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 ring-1 ring-foreground/5 md:p-5">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <SlidersHorizontal className="size-4 text-primary" />
            Asset Pair 필터
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FilterDropdown
              label="산업 분야"
              options={industries}
              selected={selectedIndustries}
              onChange={setSelectedIndustries}
            />

            <FilterDropdown
              label="데이터 유형"
              options={dataTypes}
              selected={selectedDataTypes}
              onChange={setSelectedDataTypes}
            />

            <FilterDropdown
              label="AI Task"
              options={taskTypes}
              selected={selectedTasks}
              onChange={setSelectedTasks}
            />
          </div>

          {hasFilters && (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap gap-2">
                {selectedIndustries.map((value) => (
                  <SelectedFilterChip
                    key={`industry-${value}`}
                    label={value}
                    onRemove={() =>
                      setSelectedIndustries((prev) => prev.filter((item) => item !== value))
                    }
                  />
                ))}

                {selectedDataTypes.map((value) => (
                  <SelectedFilterChip
                    key={`data-type-${value}`}
                    label={value}
                    onRemove={() =>
                      setSelectedDataTypes((prev) => prev.filter((item) => item !== value))
                    }
                  />
                ))}

                {selectedTasks.map((value) => (
                  <SelectedFilterChip
                    key={`task-${value}`}
                    label={value}
                    onRemove={() =>
                      setSelectedTasks((prev) => prev.filter((item) => item !== value))
                    }
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{filtered.length}</span>개 페어 검색됨
                </span>

                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                  <X data-icon="inline-start" />
                  필터 초기화
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span>개의 Asset Pair
            </span>
            <div className="flex rounded-lg border border-border bg-card p-1">
              {sortOptions.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setSort(o.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    sort === o.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filtered.map((pair, i) => (
                <PairCard key={pair.id} pair={pair} index={i} variant="featured" />
              ))}
            </div>
          ) : (
            <Empty className="rounded-2xl border border-dashed border-border py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search className="size-5" />
                </EmptyMedia>
                <EmptyTitle>조건에 맞는 페어가 없습니다</EmptyTitle>
                <EmptyDescription>필터를 조정하거나 검색어를 변경해 보세요.</EmptyDescription>
              </EmptyHeader>
              {hasFilters && (
                <Button variant="outline" onClick={reset}>
                  필터 초기화
                </Button>
              )}
            </Empty>
          )}
        </div>
      </section>
    </div>
  )
}

function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onChange: React.Dispatch<React.SetStateAction<string[]>>
}) {
  const buttonLabel =
    selected.length === 0
      ? label
      : selected.length === 1
        ? selected[0]
        : `${label} ${selected.length}개 선택`

  const toggleOption = (option: string) => {
    onChange((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option],
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-between font-normal"
          />
        }
      >
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-(--anchor-width) min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={selected.includes(option)}
              onCheckedChange={() => toggleOption(option)}
              onSelect={(event) => event.preventDefault()}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SelectedFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
      aria-label={`${label} 필터 제거`}
    >
      {label}
      <X className="size-3.5" />
    </button>
  )
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value.toLocaleString()}</span>
    </span>
  )
}

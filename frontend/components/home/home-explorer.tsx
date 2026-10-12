"use client"

import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronDown,
  Cpu,
  Database,
  Download,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  dataTypes,
  datasets,
  industries,
  assetPairs,
  models,
  taskTypes,
} from "@/lib/registry-data"

const stats = [
  {
    key: "datasets",
    label: "AI 데이터셋",
    value: datasets.length,
    icon: Database,
  },
  {
    key: "models",
    label: "AI 모델",
    value: models.length,
    icon: Cpu,
  },
  { key: "pairs", label: "연계 페어", value: assetPairs.length, icon: Boxes },
  {
    key: "downloadable",
    label: "다운로드 가능",
    value: assetPairs.filter((pair) => pair.downloadable).length,
    icon: Download,
  },
  {
    key: "providers",
    label: "제공 기관",
    value: 5,
    icon: Building2,
  },
]

export function HomeExplorer() {
  const [query, setQuery] = useState("")
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([])
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return assetPairs
      .filter((pair) => {
        const matchesQuery =
          !q ||
          pair.title.toLowerCase().includes(q) ||
          pair.description.toLowerCase().includes(q) ||
          pair.dataset.name.toLowerCase().includes(q) ||
          pair.model.name.toLowerCase().includes(q) ||
          pair.tags.some((tag) => tag.toLowerCase().includes(q))

        const matchesIndustry =
          selectedIndustries.length === 0 ||
          selectedIndustries.includes(pair.model.industry)

        const matchesDataType =
          selectedDataTypes.length === 0 ||
          selectedDataTypes.includes(pair.model.dataType)

        const matchesTask =
          selectedTasks.length === 0 ||
          selectedTasks.includes(pair.task)

        return (
          matchesQuery &&
          matchesIndustry &&
          matchesDataType &&
          matchesTask
        )
      })
      .sort((a, b) => b.stars - a.stars)
  }, [
    query,
    selectedIndustries,
    selectedDataTypes,
    selectedTasks,
  ])

  const hasFilters =
    query.length > 0 ||
    selectedIndustries.length > 0 ||
    selectedDataTypes.length > 0 ||
    selectedTasks.length > 0

  const resetFilters = () => {
    setQuery("")
    setSelectedIndustries([])
    setSelectedDataTypes([])
    setSelectedTasks([])
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 pt-6 text-center md:pt-10">
        <div className="flex flex-col gap-4">
          <h1 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            AAS 기반{" "}
            <span className="text-primary">
              제조 AI 자산 관리 플랫폼
            </span>
          </h1>

          <p className="mx-auto max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            표준화된 메타데이터를 활용하여 AI 모델과 데이터셋을
            연결하고,
            <br className="hidden md:block" />
            <span className="md:hidden"> </span>
            모델과 데이터 간의 관계와 이력을 탐색함으로써 제조 AI
            자산의 재사용과 확산을 지원합니다.
          </p>
        </div>

        {/* Search + Explore */}
        <div className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-border bg-card p-2 ring-1 ring-foreground/5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="데이터셋, 모델, 태그로 검색하세요"
              className="h-11 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0"
            />
          </div>

          <Button
            type="button"
            className="h-11 shrink-0"
            onClick={() =>
              document
                .getElementById("results")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            탐색하기
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid w-full grid-cols-2 gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(({ key, label, value, icon: Icon }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 ring-1 ring-foreground/5"
            >
              <Icon className="size-5 text-primary" />

              <span className="text-2xl font-semibold tabular-nums md:text-3xl">
                {value.toLocaleString()}
              </span>

              <span className="text-sm text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Filter toolbar */}
      <section
        id="results"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 ring-1 ring-foreground/5 md:p-5"
      >
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <SlidersHorizontal className="size-4 text-primary" />
          학습 조합 필터
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
                    setSelectedIndustries((prev) =>
                      prev.filter((item) => item !== value),
                    )
                  }
                />
              ))}

              {selectedDataTypes.map((value) => (
                <SelectedFilterChip
                  key={`data-type-${value}`}
                  label={value}
                  onRemove={() =>
                    setSelectedDataTypes((prev) =>
                      prev.filter((item) => item !== value),
                    )
                  }
                />
              ))}

              {selectedTasks.map((value) => (
                <SelectedFilterChip
                  key={`task-${value}`}
                  label={value}
                  onRemove={() =>
                    setSelectedTasks((prev) =>
                      prev.filter((item) => item !== value),
                    )
                  }
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {filtered.length}
                </span>
                개 학습 조합 검색됨
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                <X data-icon="inline-start" />
                필터 초기화
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Results */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {hasFilters ? "검색 결과" : "추천 학습 조합"}
          </h2>
        </div>

        {filtered.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filtered.map((pair, index) => (
              <PairCard
                key={pair.id}
                pair={pair}
                index={index}
                variant="featured"
              />
            ))}
          </div>
        ) : (
          <Empty className="rounded-2xl border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>

              <EmptyTitle>검색 결과가 없습니다</EmptyTitle>

              <EmptyDescription>
                다른 키워드나 필터로 다시 시도해 보세요.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
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
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option],
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

      <DropdownMenuContent
        align="start"
        className="w-(--anchor-width) min-w-56"
      >
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

function SelectedFilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
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

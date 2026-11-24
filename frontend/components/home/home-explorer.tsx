"use client"

import {
  ArrowRight,
  Boxes,
  Brain,
  ChevronDown,
  FilePlus2,
  Play,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import Link from "next/link"
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

const journeys = [
  {
    title: "자산 등록",
    description: "모델 허브 instance를 불러오고 실제 모델·데이터 파일을 연결합니다.",
    meta: "등록 후 모델 파일 검증 진행",
    href: "/register",
    icon: FilePlus2,
  },
  {
    title: "탐색",
    description: "데이터셋과 모델의 관계, 성능, 학습 이력을 한 화면에서 확인합니다.",
    meta: `연계 자산 ${assetPairs.length}개 · 모델 ${models.length}개 · 데이터셋 ${datasets.length}개`,
    href: "/pairs",
    icon: Boxes,
  },
  {
    title: "추론 실행",
    description: "검증된 모델에 샘플 또는 내 데이터를 넣어 결과를 바로 확인합니다.",
    meta: "모델 상세에서 실행",
    href: "/models",
    icon: Play,
  },
  {
    title: "AI 학습",
    description: "내 데이터를 업로드하면 매핑·검증·전처리를 거쳐 추가 학습합니다.",
    meta: "7단계 가이드 진행",
    href: "/training",
    icon: Brain,
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
      <section className="flex flex-col gap-8 pt-2 md:pt-6">
        <div className="flex flex-col gap-4">
          <span className="font-mono text-xs font-medium uppercase tracking-wider text-primary">
            ezAAS AI Works
          </span>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance md:text-[2.5rem] md:leading-tight">
            제조 현장의 AI를 찾고, 돌려보고, 내 데이터로 다시 학습합니다
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
            모델 허브의 instance와 실제 모델·데이터 파일을 연결해 등록하면, 검증을 거쳐 누구나 탐색하고
            추론을 실행하며 자동 전처리 기반의 추가 학습까지 이어갈 수 있습니다.
          </p>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {journeys.map((journey, index) => {
            const Icon = journey.icon
            return (
              <li key={journey.href} className="flex">
                <Link
                  href={journey.href}
                  className="group flex w-full flex-col gap-4 bg-card p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {`STEP ${index + 1}`}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {journey.title}
                      <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <span className="text-sm leading-relaxed text-muted-foreground">{journey.description}</span>
                  </div>
                  <span className="mt-auto text-xs text-muted-foreground">{journey.meta}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">바로 활용할 수 있는 연계 자산</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          데이터셋과 모델이 1:1로 연결된 조합입니다. 키워드로 찾거나 산업·데이터·Task로 좁혀 보세요.
        </p>
        <div className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-2 sm:flex-row sm:items-center">
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
            결과 보기
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </section>

      {/* Filter toolbar */}
      <section
        id="results"
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-5"
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

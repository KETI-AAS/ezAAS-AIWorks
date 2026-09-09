"use client"

import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface FilterGroup {
  id: string
  label: string
  options: readonly string[]
}

export interface SortOption {
  key: string
  label: string
}

interface RegistryExplorerProps<T> {
  title: string
  description: string
  searchPlaceholder: string
  items: T[]
  groups: readonly FilterGroup[]
  sortOptions: SortOption[]
  defaultSort: string
  countNoun: string
  getId: (item: T) => string
  getFacetValues: (item: T) => Record<string, string[]>
  getSearchText: (item: T) => string
  sortItems: (items: T[], sortKey: string) => T[]
  renderCard: (item: T, index: number) => ReactNode
}

type Selected = Record<string, string[]>

export function RegistryExplorer<T>({
  title,
  description,
  searchPlaceholder,
  items,
  groups,
  sortOptions,
  defaultSort,
  countNoun,
  getId,
  getFacetValues,
  getSearchText,
  sortItems,
  renderCard,
}: RegistryExplorerProps<T>) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState(defaultSort)
  const [selected, setSelected] = useState<Selected>({})

  // Precompute facet values + option counts once per item set.
  const facetsById = useMemo(() => {
    const map = new Map<string, Record<string, string[]>>()
    for (const item of items) map.set(getId(item), getFacetValues(item))
    return map
  }, [items, getId, getFacetValues])

  const counts = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}
    for (const g of groups) {
      result[g.id] = {}
      for (const opt of g.options) result[g.id][opt] = 0
    }
    for (const item of items) {
      const fv = facetsById.get(getId(item)) ?? {}
      for (const g of groups) {
        const vals = fv[g.id] ?? []
        for (const opt of g.options) {
          if (vals.includes(opt)) result[g.id][opt] += 1
        }
      }
    }
    return result
  }, [items, groups, facetsById, getId])

  const toggle = (groupId: string, option: string) => {
    setSelected((prev) => {
      const current = prev[groupId] ?? []
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return { ...prev, [groupId]: next }
    })
  }

  const clearAll = () => {
    setSelected({})
    setQuery("")
  }

  const selectedEntries = useMemo(
    () =>
      Object.entries(selected).flatMap(([groupId, opts]) =>
        opts.map((option) => ({ groupId, option })),
      ),
    [selected],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = items.filter((item) => {
      if (q && !getSearchText(item).toLowerCase().includes(q)) return false
      const fv = facetsById.get(getId(item)) ?? {}
      for (const g of groups) {
        const sel = selected[g.id] ?? []
        if (sel.length === 0) continue
        const vals = fv[g.id] ?? []
        if (!sel.some((s) => vals.includes(s))) return false
      }
      return true
    })
    return sortItems(result, sort)
  }, [items, query, selected, sort, groups, facetsById, getId, getSearchText, sortItems])

  const hasFilters = selectedEntries.length > 0 || query.length > 0

  const filterPanel = (
    <FilterPanel groups={groups} selected={selected} counts={counts} onToggle={toggle} />
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          <p className="max-w-2xl text-muted-foreground text-pretty">{description}</p>
        </div>
        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 rounded-xl pl-9 text-sm"
          />
        </div>
      </div>

      {/* Selected filter chips */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border py-4">
        <span className="text-sm font-medium text-muted-foreground">선택된 필터</span>
        {selectedEntries.length > 0 ? (
          selectedEntries.map(({ groupId, option }) => (
            <FilterChip
              key={`${groupId}-${option}`}
              label={option}
              onRemove={() => toggle(groupId, option)}
            />
          ))
        ) : (
          <span className="text-sm text-muted-foreground/70">없음</span>
        )}
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="ml-auto text-muted-foreground"
          >
            <X data-icon="inline-start" />
            전체 초기화
          </Button>
        )}
      </div>

      {/* Body: filter sidebar + results */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-6 rounded-2xl border border-border bg-card p-4 ring-1 ring-foreground/5">
            {filterPanel}
          </div>
        </aside>

        {/* Results */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Mobile filter trigger */}
              <Sheet>
                <SheetTrigger
                  render={
                    <Button type="button" variant="outline" size="sm" className="lg:hidden" />
                  }
                >
                  <SlidersHorizontal data-icon="inline-start" />
                  필터
                  {selectedEntries.length > 0 && (
                    <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {selectedEntries.length}
                    </span>
                  )}
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto p-4">
                  <div className="pt-2">{filterPanel}</div>
                </SheetContent>
              </Sheet>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span>개의{" "}
                {countNoun}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {sortOptions.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setSort(o.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    sort === o.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item, i) => (
                <div key={getId(item)}>{renderCard(item, i)}</div>
              ))}
            </div>
          ) : (
            <Empty className="rounded-2xl border border-dashed border-border py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search className="size-5" />
                </EmptyMedia>
                <EmptyTitle>조건에 맞는 결과가 없습니다</EmptyTitle>
                <EmptyDescription>필터를 조정하거나 검색어를 변경해 보세요.</EmptyDescription>
              </EmptyHeader>
              {hasFilters && (
                <Button variant="outline" onClick={clearAll}>
                  전체 초기화
                </Button>
              )}
            </Empty>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Filter panel                                                        */
/* ------------------------------------------------------------------ */

function FilterPanel({
  groups,
  selected,
  counts,
  onToggle,
}: {
  groups: readonly FilterGroup[]
  selected: Selected
  counts: Record<string, Record<string, number>>
  onToggle: (groupId: string, option: string) => void
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 pb-1 text-sm font-semibold">
        <SlidersHorizontal className="size-4 text-primary" />
        필터
      </div>
      {groups.map((group) => (
        <FilterGroupSection
          key={group.id}
          group={group}
          selected={selected[group.id] ?? []}
          counts={counts[group.id] ?? {}}
          onToggle={(option) => onToggle(group.id, option)}
        />
      ))}
    </div>
  )
}

function FilterGroupSection({
  group,
  selected,
  counts,
  onToggle,
}: {
  group: FilterGroup
  selected: string[]
  counts: Record<string, number>
  onToggle: (option: string) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border-b border-border py-3 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          {group.label}
          {selected.length > 0 && (
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="mt-1.5 flex flex-col">
          {group.options.map((option) => {
            const checked = selected.includes(option)
            const count = counts[option] ?? 0
            return (
              <label
                key={option}
                className="group/row flex cursor-pointer items-center gap-2.5 py-1"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background group-hover/row:border-primary/50",
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => onToggle(option)}
                />
                <span
                  className={cn(
                    "flex-1 text-sm transition-colors",
                    checked ? "font-medium text-foreground" : "text-muted-foreground group-hover/row:text-foreground",
                  )}
                >
                  {option}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground/70">{count}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
      aria-label={`${label} 필터 제거`}
    >
      {label}
      <X className="size-3" />
    </button>
  )
}

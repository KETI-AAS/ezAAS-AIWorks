"use client"

import { Boxes, Database, FileArchive, FileCode2, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { listStatus, TYPE_LABEL, type AssetState, type AssetType, type HubInstance } from "./data"
import { StatusMark } from "./status-mark"

type Filter = "all" | AssetType

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "model", label: "모델" },
  { value: "dataset", label: "데이터셋" },
]

export function InstanceBrowser({
  instances,
  states,
  selectedId,
  onSelect,
}: {
  instances: HubInstance[]
  states: Record<string, AssetState>
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return instances.filter(
      (i) =>
        (filter === "all" || i.type === filter) &&
        (!q || i.name.toLowerCase().includes(q) || i.hubId.toLowerCase().includes(q)),
    )
  }, [instances, query, filter])

  return (
    <section aria-labelledby="browser-title" className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <h2 id="browser-title" className="mr-auto text-base font-semibold">
          Model Hub에서 가져온 instance
          <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">{instances.length}</span>
        </h2>
        <div role="group" aria-label="유형 필터" className="flex rounded-md bg-secondary p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded px-3 py-1 text-sm transition-colors",
                filter === f.value
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">instance 검색</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 또는 instance ID"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      <div className="overflow-x-auto border-y border-border">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="w-10 py-2.5 pl-3 font-normal">
                <span className="sr-only">선택</span>
              </th>
              <th scope="col" className="py-2.5 font-normal">instance</th>
              <th scope="col" className="py-2.5 font-normal">유형</th>
              <th scope="col" className="py-2.5 font-normal">필요한 실제 파일</th>
              <th scope="col" className="py-2.5 pr-4 font-normal">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inst) => {
              const state = states[inst.id]
              const selected = inst.id === selectedId
              const TypeIcon = inst.type === "model" ? Boxes : Database
              const FileIcon = inst.type === "model" ? FileCode2 : FileArchive
              return (
                <tr
                  key={inst.id}
                  onClick={() => onSelect(inst.id)}
                  className={cn(
                    "cursor-pointer border-t border-border transition-colors",
                    selected ? "bg-primary/10" : "hover:bg-secondary/60",
                  )}
                >
                  <td className="py-3.5 pl-3 align-top">
                    <input
                      type="radio"
                      name="instance"
                      checked={selected}
                      onChange={() => onSelect(inst.id)}
                      aria-label={`${inst.name} 선택`}
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                    />
                  </td>
                  <td className="py-3.5 pr-4 align-top">
                    <div className={cn("font-medium", selected && "text-primary")}>{inst.name}</div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {inst.hubId} · {inst.uploadedAt}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 align-top">
                    <span className="inline-flex items-center gap-1.5">
                      <TypeIcon className="size-4 text-muted-foreground" aria-hidden />
                      {TYPE_LABEL[inst.type]}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 align-top">
                    {state.file ? (
                      <span className="inline-flex max-w-56 items-center gap-1.5">
                        <FileIcon className="size-4 shrink-0 text-success" aria-hidden />
                        <span className="truncate font-mono text-xs">{state.file.name}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <FileIcon className="size-4 shrink-0" aria-hidden />
                        <span className="font-mono text-xs">{inst.requiredExt}</span> 미연결
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 align-top">
                    <StatusMark status={listStatus(state)} />
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  조건에 맞는 instance가 없어요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
        목록은 Model Hub에 내가 올린 instance입니다. 새 instance는 Model Hub에서 만든 뒤 이곳에 나타납니다.
      </p>
    </section>
  )
}

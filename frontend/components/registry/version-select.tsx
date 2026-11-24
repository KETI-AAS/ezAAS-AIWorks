"use client"

import { Check, GitCommitVertical, History } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import type { VersionEntry } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

export function VersionSelect({
  versions,
  value,
  onValueChange,
  className,
}: {
  versions: VersionEntry[]
  value: string
  onValueChange: (version: string) => void
  className?: string
}) {
  const latest = versions[0]?.version

  return (
    <Select value={value} onValueChange={(v) => v && onValueChange(v)}>
      <SelectTrigger
        size="sm"
        aria-label="버전 선택"
        className={cn(
          "h-7 gap-1 rounded-md border-border bg-muted/40 px-2 font-mono text-xs font-medium",
          className,
        )}
      >
        <GitCommitVertical className="size-3.5 text-primary" />
        <span>{value}</span>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className="min-w-56">
        {versions.map((entry) => {
          const isLatest = entry.version === latest
          const isSelected = entry.version === value
          return (
            <SelectItem key={entry.version} value={entry.version} className="pr-2">
              <span className="flex w-full items-center gap-2">
                <span className="flex size-4 items-center justify-center">
                  {isSelected && <Check className="size-3.5 text-primary" />}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-medium">{entry.version}</span>
                    {isLatest && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                        최신
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.date} · {entry.author}
                  </span>
                </span>
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

export function PreviousVersionNotice({ entry }: { entry: VersionEntry }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
      <History className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-pretty">
        <span className="font-medium text-foreground">이전 버전</span>
        {` (${entry.date})을 보고 있습니다 · ${entry.changes}`}
      </p>
    </div>
  )
}

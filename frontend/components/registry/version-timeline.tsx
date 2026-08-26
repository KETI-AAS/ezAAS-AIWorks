import { GitCommitVertical } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { VersionEntry } from "@/lib/registry-data"

export function VersionTimeline({ versions }: { versions: VersionEntry[] }) {
  return (
    <ol className="relative flex flex-col">
      {versions.map((entry, i) => (
        <li key={entry.version} className="relative flex gap-4 pb-6 last:pb-0">
          {i < versions.length - 1 && (
            <span
              aria-hidden
              className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border"
            />
          )}
          <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary">
            <GitCommitVertical className="size-4" />
          </span>
          <div className="flex flex-1 flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={i === 0 ? "default" : "secondary"} className="font-mono">
                  {entry.version}
                </Badge>
                {i === 0 && (
                  <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">
                    최신
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{entry.date}</span>
            </div>
            <p className="text-sm text-foreground">{entry.changes}</p>
            <span className="text-xs text-muted-foreground">작성자 · {entry.author}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

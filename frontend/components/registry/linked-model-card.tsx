import { ChevronRight, Target } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { TaskBadge } from "@/components/registry/task-badge"
import { Badge } from "@/components/ui/badge"
import { getTaskThumbnail, type Model } from "@/lib/registry-data"

export function LinkedModelCard({ model }: { model: Model }) {
  return (
    <Link
      href={`/models/${model.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image src={getTaskThumbnail(model.task)} alt={model.name} fill className="object-cover" sizes="64px" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
        <div className="flex items-center gap-2">
          <TaskBadge task={model.task} />
          <Badge variant="outline" className="font-mono">
            {model.version}
          </Badge>
        </div>
        <span className="truncate font-medium text-foreground">{model.name}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
          <Target className="size-3.5 text-primary" />
          정확도 {model.accuracy}%
        </span>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  )
}

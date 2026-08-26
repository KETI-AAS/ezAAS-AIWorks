import { Boxes, Crosshair, ScanText, Shapes, Waves } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { TaskType } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

const taskIcon: Record<TaskType, typeof Boxes> = {
  "Object Detection": Crosshair,
  Segmentation: Shapes,
  Classification: Boxes,
  OCR: ScanText,
  "Anomaly Detection": Waves,
}

export function TaskBadge({
  task,
  className,
}: {
  task: TaskType
  className?: string
}) {
  const Icon = taskIcon[task]
  return (
    <Badge variant="secondary" className={cn("gap-1.5", className)}>
      <Icon className="size-3.5" />
      {task}
    </Badge>
  )
}

import { AlertTriangle, CheckCircle2, Circle, CircleDot, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_LABEL, type ListStatus } from "./data"

const TONE: Record<ListStatus, string> = {
  "needs-file": "text-muted-foreground",
  ready: "text-primary",
  validating: "text-progress",
  passed: "text-success",
  failed: "text-warning",
}

export function StatusMark({ status, className }: { status: ListStatus; className?: string }) {
  const Icon =
    status === "passed"
      ? CheckCircle2
      : status === "failed"
        ? AlertTriangle
        : status === "validating"
          ? Loader2
          : status === "ready"
            ? CircleDot
            : Circle
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", TONE[status], className)}>
      <Icon className={cn("size-4 shrink-0", status === "validating" && "animate-spin")} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  )
}

import { AlertTriangle, CheckCircle2, Circle, Loader2, Lock } from "lucide-react"

import type { StepState } from "@/lib/concept-sample"
import { cn } from "@/lib/utils"

const stateLabel: Record<StepState, string> = {
  done: "완료",
  active: "진행 중",
  todo: "대기",
  warn: "확인 필요",
  locked: "잠김",
}

export function StateIcon({ state, className }: { state: StepState; className?: string }) {
  const base = cn("size-4 shrink-0", className)
  const label = <span className="sr-only">{stateLabel[state]}</span>
  switch (state) {
    case "done":
      return (
        <>
          <CheckCircle2 aria-hidden className={cn(base, "text-success")} />
          {label}
        </>
      )
    case "active":
      return (
        <>
          <Loader2 aria-hidden className={cn(base, "animate-spin text-primary")} />
          {label}
        </>
      )
    case "warn":
      return (
        <>
          <AlertTriangle aria-hidden className={cn(base, "text-warning")} />
          {label}
        </>
      )
    case "locked":
      return (
        <>
          <Lock aria-hidden className={cn(base, "text-muted-foreground")} />
          {label}
        </>
      )
    default:
      return (
        <>
          <Circle aria-hidden className={cn(base, "text-muted-foreground/60")} />
          {label}
        </>
      )
  }
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full", value >= 100 ? "bg-success" : "bg-primary")}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

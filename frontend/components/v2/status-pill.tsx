import { AlertTriangle, CheckCircle2, Circle, LoaderCircle, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

export type StatusTone = "idle" | "progress" | "success" | "warning" | "danger"

const toneStyles: Record<StatusTone, string> = {
  idle: "border-border bg-muted text-muted-foreground",
  progress: "border-progress/30 bg-progress/10 text-progress",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
}

const toneIcons = {
  idle: Circle,
  progress: LoaderCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const

export function StatusPill({
  tone,
  children,
  className,
  hideIcon,
}: {
  tone: StatusTone
  children: React.ReactNode
  className?: string
  hideIcon?: boolean
}) {
  const Icon = toneIcons[tone]
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap",
        toneStyles[tone],
        className,
      )}
    >
      {!hideIcon && (
        <Icon className={cn("size-3.5", tone === "progress" && "animate-spin")} aria-hidden="true" />
      )}
      {children}
    </span>
  )
}

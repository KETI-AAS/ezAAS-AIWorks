import { cn } from "@/lib/utils"

export function StatTile({
  label,
  value,
  suffix,
  hint,
  accent,
}: {
  label: string
  value: string | number
  suffix?: string
  hint?: string
  accent?: boolean
}) {
  const valueText = String(value)
  const valueSize =
    valueText.length > 12
      ? "text-base"
      : valueText.length > 8
        ? "text-lg"
        : "text-2xl"

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 overflow-hidden rounded-xl border border-border bg-card p-4",
        accent && "border-primary/30 bg-primary/5",
      )}
    >
      <span className="truncate whitespace-nowrap text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="flex min-w-0 items-baseline gap-1 whitespace-nowrap">
        <span
          className={cn(
            "min-w-0 truncate font-semibold tracking-tight tabular-nums",
            valueSize,
            accent && "text-primary",
          )}
          title={valueText}
        >
          {value}
        </span>
        {suffix && (
          <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>
        )}
      </span>
      {hint && (
        <span className="truncate whitespace-nowrap text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  )
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  )
}

import { ArrowRight, Lock, type LucideIcon } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export type NextStepItem = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  primary?: boolean
  disabledReason?: string
}

export function NextStepList({ items, className }: { items: NextStepItem[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3 md:grid-cols-3", className)}>
      {items.map((item) => (
        <li key={item.title} className="flex">
          <NextStepCard item={item} />
        </li>
      ))}
    </ul>
  )
}

function NextStepCard({ item }: { item: NextStepItem }) {
  const Icon = item.icon
  const disabled = Boolean(item.disabledReason)
  const body = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          item.primary && !disabled ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {disabled ? <Lock className="size-4" /> : <Icon className="size-4" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {item.title}
          {!disabled && (
            <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          )}
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground">
          {disabled ? item.disabledReason : item.description}
        </span>
      </span>
    </>
  )

  const base =
    "group flex w-full items-start gap-3 rounded-lg border bg-card p-4 text-left transition-colors"

  if (disabled) {
    return (
      <div aria-disabled="true" className={cn(base, "border-dashed border-border opacity-70")}>
        {body}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        base,
        item.primary ? "border-primary/40 hover:border-primary" : "border-border hover:border-foreground/25",
      )}
    >
      {body}
    </Link>
  )
}

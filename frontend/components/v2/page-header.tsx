import { cn } from "@/lib/utils"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  width = "max-w-7xl",
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
  width?: string
}) {
  return (
    <section className={cn("border-b border-border bg-surface", className)}>
      <div className={cn("mx-auto flex w-full flex-col gap-5 px-4 py-7 md:px-8 md:py-8", width)}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            {eyebrow && (
              <span className="font-mono text-xs font-medium uppercase tracking-wider text-primary">
                {eyebrow}
              </span>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-[1.75rem]">{title}</h1>
            {description && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty md:text-[0.95rem]">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  )
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

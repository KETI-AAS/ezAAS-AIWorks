import { ArrowRight, ChevronDown, FlaskConical } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export type Tone = "neutral" | "progress" | "success" | "warning" | "danger"

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  progress: "bg-secondary text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/18 text-warning-foreground",
  danger: "bg-destructive/10 text-destructive",
}

const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  progress: "bg-primary animate-pulse",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
}

export function StatusTag({
  tone,
  children,
  size = "md",
  className,
}: {
  tone: Tone
  children: React.ReactNode
  size?: "md" | "lg"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-medium",
        size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-[13px]",
        toneClass[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", dotClass[tone])} />
      {children}
    </span>
  )
}

/** Secondary, collapsible area for technical metadata. Closed by default. */
export function TechDetails({
  title = "기술 정보",
  hint,
  children,
  defaultOpen = false,
  className,
}: {
  title?: string
  hint?: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  return (
    <details
      open={defaultOpen}
      className={cn("group rounded-xl border border-border bg-card", className)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{title}</span>
          {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
        </span>
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-border px-5 py-5">{children}</div>
    </details>
  )
}

export function KeyValues({ items, mono = false }: { items: { label: string; value: string }[]; mono?: boolean }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">{it.label}</dt>
          <dd className={cn("text-[15px] text-foreground", mono && "font-mono text-sm")}>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Marks simulated execution or sample output. Never omit on demo results. */
export function DemoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-start gap-2 rounded-lg border border-dashed border-warning/70 bg-warning/10 px-3 py-2 text-sm leading-relaxed text-warning-foreground",
        className,
      )}
    >
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/** The signature "what to do next" band, used at every decision point. */
export function NextAction({
  title,
  description,
  primary,
  secondary,
  className,
}: {
  title: string
  description?: string
  primary: { href: string; label: string }
  secondary?: { href: string; label: string }
  className?: string
}) {
  return (
    <section
      aria-label="다음 할 일"
      className={cn(
        "flex flex-col gap-5 rounded-2xl bg-foreground px-6 py-6 text-background md:flex-row md:items-center md:justify-between md:px-8",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span aria-hidden className="mt-1.5 size-3 shrink-0 rounded-full bg-accent" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-background/70">다음 할 일</p>
          <p className="text-xl font-semibold text-balance">{title}</p>
          {description ? <p className="text-[15px] leading-relaxed text-background/75 text-pretty">{description}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {secondary ? (
          <Link
            href={secondary.href}
            className="rounded-lg px-4 py-2.5 text-[15px] font-medium text-background/85 underline-offset-4 hover:underline"
          >
            {secondary.label}
          </Link>
        ) : null}
        <Link
          href={primary.href}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-[15px] font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
        >
          {primary.label}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </section>
  )
}

export function PrimaryLink({
  href,
  children,
  className,
  variant = "primary",
}: {
  href: string
  children: React.ReactNode
  className?: string
  variant?: "primary" | "outline" | "accent"
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-[15px] font-semibold transition-colors",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "accent" && "bg-accent text-accent-foreground hover:bg-accent/85",
        variant === "outline" && "border border-border bg-card text-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </Link>
  )
}

/** Plain "넣는 것 → 받는 것" strip that answers what the AI needs and returns. */
export function InputOutput({
  input,
  output,
  className,
  large = false,
}: {
  input: string
  output: string
  className?: string
  large?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-stretch", className)}>
      <div className="flex flex-1 flex-col gap-1 rounded-xl bg-muted px-4 py-3">
        <span className="text-sm text-muted-foreground">넣는 것</span>
        <span className={cn("font-medium text-foreground", large ? "text-lg" : "text-[15px]")}>{input}</span>
      </div>
      <ArrowRight aria-hidden className="size-5 shrink-0 self-center text-muted-foreground max-sm:rotate-90" />
      <div className="flex flex-1 flex-col gap-1 rounded-xl bg-secondary px-4 py-3">
        <span className="text-sm text-primary">받는 것</span>
        <span className={cn("font-medium text-foreground", large ? "text-lg" : "text-[15px]")}>{output}</span>
      </div>
    </div>
  )
}

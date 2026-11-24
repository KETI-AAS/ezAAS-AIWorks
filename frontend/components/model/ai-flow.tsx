"use client"

import { Database, Cog, Box, Rocket, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { FlowStep } from "@/lib/registry-data"

const stageMeta: Record<
  FlowStep["stage"],
  { icon: typeof Database; tint: string }
> = {
  Dataset: { icon: Database, tint: "text-chart-3 bg-chart-3/10" },
  Training: { icon: Cog, tint: "text-chart-2 bg-chart-2/10" },
  Model: { icon: Box, tint: "text-primary bg-primary/10" },
  Deployment: { icon: Rocket, tint: "text-chart-4 bg-chart-4/10" },
}

export function AiFlow({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      {steps.map((step, i) => {
        const meta = stageMeta[step.stage]
        const Icon = meta.icon
        return (
          <div
            key={step.id}
            className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center"
          >
            <Card className="flex-1 gap-0 p-5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    meta.tint,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="flex flex-col">
                  <Badge variant="outline" className="w-fit text-xs">
                    {step.stage}
                  </Badge>
                </div>
              </div>
              <h3 className="mt-4 font-medium leading-tight text-balance">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {step.subtitle}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-pretty">
                {step.detail}
              </p>
              <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {step.meta.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <dt className="text-muted-foreground">{m.label}</dt>
                    <dd className="font-medium tabular-nums">{m.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            {i < steps.length - 1 && (
              <div className="flex shrink-0 items-center justify-center text-muted-foreground lg:px-1">
                <ArrowRight className="hidden size-5 lg:block" />
                <ArrowRight className="size-5 rotate-90 lg:hidden" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

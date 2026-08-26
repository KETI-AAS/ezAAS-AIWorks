"use client"

import { Check } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export const TRAINING_STEPS = [
  "AI Model 선택",
  "데이터 업로드",
  "Semantic Mapping",
  "데이터 검증",
  "자동 전처리",
  "AI Training",
  "결과 확인",
] as const

export function TrainingStepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number
  onStepClick: (step: number) => void
}) {
  return (
    <Card size="sm">
      <CardContent className="py-1">
        <ol className="flex items-center gap-1 overflow-x-auto">
          {TRAINING_STEPS.map((label, index) => {
            const stepNumber = index + 1
            const isComplete = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep
            return (
              <li key={label} className="flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onStepClick(stepNumber)}
                  className="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted/60"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isComplete && "bg-primary text-primary-foreground",
                      isCurrent && "bg-primary text-primary-foreground",
                      !isComplete &&
                        !isCurrent &&
                        "border border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {isComplete ? <Check className="size-3.5" /> : stepNumber}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-sm",
                      isCurrent
                        ? "font-medium text-foreground"
                        : isComplete
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </button>
                {index < TRAINING_STEPS.length - 1 && (
                  <Separator className="mx-1.5 hidden w-6 shrink-0 lg:block" />
                )}
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}

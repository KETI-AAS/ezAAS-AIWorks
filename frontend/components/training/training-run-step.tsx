"use client"

import {
  ArrowLeft,
  Check,
  CircleCheck,
  CircleDashed,
  Gauge,
  LoaderCircle,
  Play,
  Square,
  Target,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { TRAINING_LOG_LINES } from "@/lib/training-data"
import { cn } from "@/lib/utils"

export type TrainingStatus = "idle" | "running" | "complete"

export type TrainingIntensity = "quick" | "precise"

export interface TrainingConfig {
  intensity: TrainingIntensity
  epoch: string
  trainRatio: number
}

type TrainingRunStepProps = {
  config: TrainingConfig
  onConfigChange: (next: TrainingConfig) => void
  status: TrainingStatus
  progress: number
  logIndex: number
  onBack: () => void
  onStart: () => void
  onStop: () => void
}

const QUICK_TRAINING_EPOCH = 10
const MIN_PRECISE_EPOCH = 10
const MAX_PRECISE_EPOCH = 200

export function TrainingRunStep({
  config,
  onConfigChange,
  status,
  progress,
  logIndex,
  onBack,
  onStart,
  onStop,
}: TrainingRunStepProps) {
  const disabled = status === "running"
  const validationRatio = 100 - config.trainRatio

  const effectiveEpoch =
    config.intensity === "quick"
      ? QUICK_TRAINING_EPOCH
      : Number(config.epoch || 0)

  const isEpochValid =
    config.intensity === "quick" ||
    (effectiveEpoch >= MIN_PRECISE_EPOCH &&
      effectiveEpoch <= MAX_PRECISE_EPOCH)

  const handleIntensityChange = (intensity: TrainingIntensity) => {
    if (disabled) return

    onConfigChange({
      ...config,
      intensity,
      epoch:
        intensity === "quick"
          ? String(QUICK_TRAINING_EPOCH)
          : config.epoch === String(QUICK_TRAINING_EPOCH)
            ? "30"
            : config.epoch,
    })
  }

  const handleTrainRatioChange = (trainRatio: number) => {
    if (disabled) return

    onConfigChange({
      ...config,
      trainRatio,
    })
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-6 py-6">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            6
          </span>

          <div>
            <h2 className="text-xl font-semibold">AI Training</h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              전처리된 데이터를 기반으로 모델 추가 학습을 진행합니다.
            </p>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-5 lg:grid-cols-2">
          {/* Training settings */}
          <section className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-semibold">학습 설정</h3>
            </div>

            <div className="flex flex-col">
              {/* Training intensity */}
              <div className="border-b border-border px-5 py-5">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      1
                    </span>

                    <h4 className="font-semibold">학습 강도</h4>
                  </div>

                  <p className="mt-1.5 pl-8 text-sm text-muted-foreground">
                    추가 학습에 사용할 Epoch 수를 선택합니다.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Quick training */}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleIntensityChange("quick")}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      config.intensity === "quick"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:bg-muted/30",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                          config.intensity === "quick"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        {config.intensity === "quick" ? (
                          <Check className="size-3" />
                        ) : null}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Zap className="size-4 text-emerald-500" />
                          <p className="font-semibold">빠른 학습</p>
                        </div>

                        <p className="mt-2 font-mono text-sm font-semibold">
                          {QUICK_TRAINING_EPOCH} Epoch
                        </p>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          고정된 Epoch로 빠르게 추가 학습합니다.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Precise training */}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleIntensityChange("precise")}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      config.intensity === "precise"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:bg-muted/30",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                          config.intensity === "precise"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        {config.intensity === "precise" ? (
                          <Check className="size-3" />
                        ) : null}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Target className="size-4 text-violet-500" />
                          <p className="font-semibold">정밀 학습</p>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          사용자가 지정한 Epoch만큼 추가 학습합니다.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {config.intensity === "precise" ? (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
                    <label
                      htmlFor="precise-epoch"
                      className="text-sm font-medium"
                    >
                      Epoch 수
                    </label>

                    <div className="relative mt-2">
                      <Input
                        id="precise-epoch"
                        type="number"
                        min={MIN_PRECISE_EPOCH}
                        max={MAX_PRECISE_EPOCH}
                        value={config.epoch}
                        disabled={disabled}
                        onChange={(event) =>
                          onConfigChange({
                            ...config,
                            epoch: event.target.value,
                          })
                        }
                        className="pr-12"
                      />

                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
                        회
                      </span>
                    </div>

                    <p
                      className={cn(
                        "mt-2 text-xs",
                        isEpochValid
                          ? "text-muted-foreground"
                          : "text-destructive",
                      )}
                    >
                      {MIN_PRECISE_EPOCH}~{MAX_PRECISE_EPOCH} 사이의 값을
                      입력해주세요.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Data split */}
              <div className="px-5 py-5">
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      2
                    </span>

                    <h4 className="font-semibold">데이터 분할 비율</h4>
                  </div>

                  <p className="mt-1.5 pl-8 text-sm text-muted-foreground">
                    학습 데이터와 테스트 데이터의 비율을 설정합니다.
                  </p>
                </div>

                <div className="grid grid-cols-[88px_minmax(0,1fr)_88px] items-end gap-4">
                  <RatioField
                    label="학습 데이터"
                    value={config.trainRatio}
                  />

                  <input
                    type="range"
                    min={60}
                    max={90}
                    step={5}
                    value={config.trainRatio}
                    disabled={disabled}
                    onChange={(event) =>
                      handleTrainRatioChange(Number(event.target.value))
                    }
                    className="mb-3 h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
                    aria-label="학습 데이터 비율"
                  />

                  <RatioField
                    label="검증 데이터"
                    value={validationRatio}
                  />
                </div>

                <div className="mt-4 flex overflow-hidden rounded-full bg-muted">
                  <div
                    className="flex h-2.5 items-center justify-center bg-primary transition-[width]"
                    style={{ width: `${config.trainRatio}%` }}
                  />

                  <div
                    className="h-2.5 bg-primary/25 transition-[width]"
                    style={{ width: `${validationRatio}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>학습 {config.trainRatio}%</span>
                  <span>검증 {validationRatio}%</span>
                </div>

                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  기본 분할 비율은 학습 80%, 테스트 20%입니다.
                </p>
              </div>
            </div>
          </section>

          {/* Training progress */}
          <section className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-semibold">학습 진행 상황</h3>
            </div>

            <div className="flex min-h-[520px] flex-col">
              {status === "idle" ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Play className="size-7" />
                  </span>

                  <h4 className="mt-5 text-lg font-semibold">
                    AI Training을 시작할 준비가 완료되었습니다.
                  </h4>

                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    학습 강도와 데이터 분할 비율을 확인한 후
                    <br className="hidden sm:block" />
                    AI Training 시작 버튼을 눌러주세요.
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-5 p-5">
                  {/* Progress */}
                  <div className="rounded-xl border border-border bg-muted/10 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-10 items-center justify-center rounded-full",
                            status === "complete"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {status === "complete" ? (
                            <CircleCheck className="size-5" />
                          ) : (
                            <LoaderCircle className="size-5 animate-spin" />
                          )}
                        </span>

                        <div>
                          <p className="font-semibold">
                            {status === "complete"
                              ? "AI Training 완료"
                              : "AI Training 진행 중"}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {status === "complete"
                              ? "모든 학습 과정이 정상적으로 완료되었습니다."
                              : `Epoch ${Math.max(
                                  1,
                                  Math.ceil(
                                    (progress / 100) * effectiveEpoch,
                                  ),
                                )} / ${effectiveEpoch}`}
                          </p>
                        </div>
                      </div>

                      <span className="font-mono text-lg font-semibold tabular-nums">
                        {Math.round(progress)}%
                      </span>
                    </div>

                    <Progress value={progress} className="mt-4" />
                  </div>

                  {/* Logs */}
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
                    <div className="border-b border-border bg-muted/20 px-4 py-3">
                      <h4 className="text-sm font-semibold">학습 로그</h4>
                    </div>

                    <div className="min-h-72 flex-1 overflow-y-auto bg-muted/10 p-4">
                      <ol className="flex flex-col gap-3">
                        {TRAINING_LOG_LINES.map((line, index) => {
                          const done =
                            status === "complete" || index < logIndex
                          const active =
                            status === "running" && index === logIndex

                          return (
                            <li
                              key={`${line}-${index}`}
                              className="flex items-start gap-2.5 text-sm"
                            >
                              {done ? (
                                <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                              ) : active ? (
                                <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                              ) : (
                                <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
                              )}

                              <span
                                className={cn(
                                  "leading-5",
                                  done && "text-foreground",
                                  active &&
                                    "font-medium text-foreground",
                                  !done &&
                                    !active &&
                                    "text-muted-foreground/60",
                                )}
                              >
                                {line}
                              </span>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={status === "running"}
          >
            <ArrowLeft className="size-4" />
            이전 단계
          </Button>

          {status === "running" ? (
            <Button type="button" variant="destructive" onClick={onStop}>
              <Square className="size-4" />
              학습 중지
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={onStart}
              disabled={status === "complete" || !isEpochValid}
              className="sm:min-w-56"
            >
              <Play className="size-4" />
              AI Training 시작
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RatioField({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div>
      <p className="mb-2 whitespace-nowrap text-xs text-muted-foreground">
        {label}
      </p>

      <div className="flex h-10 items-center overflow-hidden rounded-lg border border-border bg-background">
        <span className="flex-1 px-3 font-mono text-sm font-semibold tabular-nums">
          {value}
        </span>

        <span className="border-l border-border px-3 text-sm text-muted-foreground">
          %
        </span>
      </div>
    </div>
  )
}
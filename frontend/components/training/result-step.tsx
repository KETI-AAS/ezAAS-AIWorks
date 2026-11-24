"use client"

import { ArrowLeft, ArrowRight, CircleCheck, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  PERFORMANCE_METRICS,
  nextVersion,
  type PerformanceMetric,
} from "@/lib/training-data"
import type { Model } from "@/lib/registry-data"

export function ResultStep({
  model,
  datasetFileName,
  onBack,
  onRestart,
}: {
  model: Model
  datasetFileName: string
  onBack: () => void
  onRestart: () => void
}) {
  const newVersion = nextVersion(model.version)
  const completedAt = "2024-06-01 10:28:45"

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 py-2">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            7
          </span>
          <div>
            <h2 className="text-lg font-semibold">결과 확인</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              학습 결과를 확인하고 새로운 모델을 저장합니다.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Performance comparison */}
          <div className="flex flex-col gap-4 rounded-xl border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">성능 비교</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                  기존 모델 ({model.version})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary" />
                  새 모델 ({newVersion})
                </span>
              </div>
            </div>
            <ul className="flex flex-col gap-4">
              {PERFORMANCE_METRICS.map((metric) => (
                <MetricComparison key={metric.label} metric={metric} />
              ))}
            </ul>
          </div>

          {/* Model info */}
          <aside className="flex flex-col gap-4 rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold">모델 정보</h3>
            <InfoRow label="모델명" value={model.name} />
            <Separator />
            <InfoRow
              label="버전"
              value={
                <span className="flex items-center gap-1.5">
                  <span className="font-mono">{newVersion}</span>
                  <Badge className="border-primary/20 bg-primary/10 text-primary">
                    신규
                  </Badge>
                </span>
              }
            />
            <Separator />
            <InfoRow label="학습 데이터" value={datasetFileName} mono />
            <Separator />
            <InfoRow label="학습 완료 시간" value={completedAt} mono />
          </aside>
        </div>

        {/* Success banner */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CircleCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              학습 완료
            </p>
            <p className="mt-0.5 text-sm text-emerald-700/80 dark:text-emerald-400/80">
              새로운 모델이 성공적으로 생성되었습니다.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft />
            이전 단계
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onRestart}>
              <RotateCcw />
              새 학습 시작
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("모델 상세 화면으로 이동합니다")}
            >
              모델 상세 보기
            </Button>
            <Button
              onClick={() => toast.success("새 모델이 Model Registry에 등록되었습니다")}
            >
              Model Registry에 등록
              <ArrowRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricComparison({ metric }: { metric: PerformanceMetric }) {
  const delta = metric.next - metric.base
  const improved = delta > 0
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{metric.label}</span>
        <span
          className={cnDelta(improved)}
        >
          {improved ? "+" : ""}
          {delta.toFixed(3)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <BarRow value={metric.base} color="bg-muted-foreground/40" />
        <BarRow value={metric.next} color="bg-primary" />
      </div>
    </li>
  )
}

function cnDelta(improved: boolean): string {
  return improved
    ? "font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400"
    : "font-mono text-xs font-semibold text-muted-foreground"
}

function BarRow({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={`block h-full rounded-full ${color}`}
          style={{ width: `${value * 100}%` }}
        />
      </span>
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
        {value.toFixed(3)}
      </span>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={
          mono
            ? "break-all font-mono text-sm text-foreground"
            : "text-sm font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  )
}

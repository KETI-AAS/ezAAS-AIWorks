"use client"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Columns3,
  Database,
  Download,
  Filter,
  LoaderCircle,
  Rows3,
  Sparkles,
  Upload,
} from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  TRAINING_VALIDATION_RESULTS,
  UPLOAD_PREVIEW_COLUMNS,
  UPLOAD_PREVIEW_ROWS,
  type TrainingMappingRow,
} from "@/lib/training-data"

export function DataPreprocessingStep({
  mappingRows,
  sourceRowCount,
  onBack,
  onReupload,
  onNext,
}: {
  mappingRows: TrainingMappingRow[]
  sourceRowCount: number
  onBack: () => void
  onReupload: () => void
  onNext: () => void
}) {
  const [progress, setProgress] = useState(0)
  const includedRows = mappingRows.filter((row) => row.status !== "excluded")
  const excludedRows = mappingRows.filter((row) => row.status === "excluded")
  const reviewRows = mappingRows.filter((row) => row.status === "review")
  const includedColumns = includedRows.map((row) => row.column)
  const visibleColumns = UPLOAD_PREVIEW_COLUMNS.filter((column) =>
    includedColumns.includes(column),
  )
  const columnIndexes = visibleColumns.map((column) =>
    UPLOAD_PREVIEW_COLUMNS.indexOf(column),
  )
  const finalRowCount = Math.max(sourceRowCount - Math.round(sourceRowCount * 0.015), 0)
  const isComplete = progress >= 100
  const processSteps = [
    "검증 결과 및 권장 조치 불러오기",
    "제외 컬럼 제거",
    "결측치 및 라벨 데이터 변환",
    "학습 데이터셋 생성",
  ]
  const activeStep = Math.min(Math.floor(progress / 25), processSteps.length - 1)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 5, 100)
        if (next === 100) window.clearInterval(timer)
        return next
      })
    }, 120)

    return () => window.clearInterval(timer)
  }, [])

  const downloadCsv = () => {
    const rows = [
      visibleColumns,
      ...UPLOAD_PREVIEW_ROWS.map((row) => columnIndexes.map((index) => row[index])),
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "preprocessed-training-data.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              5
            </span>
            <div>
              <h2 className="text-xl font-semibold">자동 전처리</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                데이터 검증에서 선택한 조치에 따라 자동 전처리가 완료되었습니다.
                <br className="hidden sm:block" />
                처리된 데이터를 확인한 후 AI Training을 진행하세요.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <Badge
              className={
                isComplete
                  ? "gap-1.5 rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
                  : "gap-1.5 rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700"
              }
            >
              {isComplete ? <CircleCheck className="size-3.5" /> : <LoaderCircle className="size-3.5 animate-spin" />}
              {isComplete ? "전처리 완료" : "전처리 진행 중"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {isComplete ? "Mock preprocessing result" : `${progress}% 처리됨`}
            </span>
          </div>
        </div>

        {!isComplete ? (
          <div className="px-5 py-5">
            <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-xl border border-border bg-muted/10 px-6 py-8">
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-6 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">학습 데이터를 전처리하고 있습니다</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    화면을 닫지 말고 잠시 기다려 주세요.
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{processSteps[activeStep]}</span>
                  <span className="font-mono font-semibold tabular-nums">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <ol className="grid gap-3 sm:grid-cols-2">
                {processSteps.map((step, index) => {
                  const done = index < activeStep
                  const active = index === activeStep
                  return (
                    <li key={step} className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm">
                      {done ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="size-3.5" />
                        </span>
                      ) : active ? (
                        <LoaderCircle className="size-5 animate-spin text-primary" />
                      ) : (
                        <span className="size-5 rounded-full border border-border bg-muted" />
                      )}
                      <span className={active ? "font-medium text-foreground" : "text-muted-foreground"}>{step}</span>
                    </li>
                  )
                })}
              </ol>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Badge variant="secondary">대상 컬럼 {includedRows.length}개</Badge>
                <Badge variant="secondary">제외 컬럼 {excludedRows.length}개</Badge>
                <Badge variant="secondary">권장 조치 {reviewRows.length}개</Badge>
              </div>
            </section>
          </div>
        ) : (
        <div className="flex flex-col gap-6 px-5 py-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="전처리 결과 요약">
            <SummaryCard
              icon={<Database className="size-5" />}
              title="원본 컬럼"
              value={String(mappingRows.length)}
              suffix="개"
              description="Semantic Mapping 대상 컬럼"
              iconClassName="bg-blue-50 text-blue-600"
            />
            <SummaryCard
              icon={<Columns3 className="size-5" />}
              title="전처리 후 컬럼"
              value={String(includedRows.length)}
              suffix="개"
              description="학습 데이터에 포함된 컬럼"
              iconClassName="bg-emerald-50 text-emerald-600"
            />
            <SummaryCard
              icon={<Filter className="size-5" />}
              title="제외된 컬럼"
              value={String(excludedRows.length)}
              suffix="개"
              description={excludedRows.map((row) => row.column).join(", ") || "없음"}
              iconClassName="bg-orange-50 text-orange-600"
            />
            <SummaryCard
              icon={<Rows3 className="size-5" />}
              title="최종 데이터"
              value={finalRowCount.toLocaleString("ko-KR")}
              suffix={`행 × ${includedRows.length} 컬럼`}
              description="전처리가 완료된 최종 학습 데이터"
              iconClassName="bg-violet-50 text-violet-600"
            />
          </section>


          <section className="overflow-hidden rounded-xl border border-border">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">전처리된 데이터 미리보기</h3>
                  <Badge variant="secondary" className="font-normal">최대 5행</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  제외 컬럼을 제거한 기존 업로드 미리보기 데이터입니다.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-14 border-r border-border px-3 py-3 text-center text-xs font-medium text-muted-foreground">No.</th>
                    {visibleColumns.map((column) => (
                      <th key={column} className="min-w-32 border-r border-border px-4 py-3 text-left font-mono text-xs font-semibold last:border-r-0">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {UPLOAD_PREVIEW_ROWS.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border last:border-b-0 hover:bg-muted/15">
                      <td className="border-r border-border px-3 py-3 text-center font-mono text-xs text-muted-foreground">{rowIndex + 1}</td>
                      {columnIndexes.map((columnIndex) => (
                        <td key={columnIndex} className="border-r border-border px-4 py-3 font-mono text-xs last:border-r-0">
                          {row[columnIndex] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-muted/10 px-5 py-3 text-xs text-muted-foreground">
              <span>전체 {finalRowCount.toLocaleString("ko-KR")}행 중 {UPLOAD_PREVIEW_ROWS.length}행 표시</span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-500" />
                자동 전처리 적용 완료
              </span>
            </div>
          </section>
        </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <Button type="button" variant="outline" onClick={onReupload} className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100">
            <Upload className="size-4" />
            데이터 재업로드
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4" />
              이전: 데이터 검증
            </Button>
            <Button type="button" onClick={onNext} disabled={!isComplete} className="sm:min-w-56">
              다음: AI Training 실행
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  icon,
  title,
  value,
  suffix,
  description,
  iconClassName,
}: {
  icon: React.ReactNode
  title: string
  value: string
  suffix: string
  description: string
  iconClassName: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-start gap-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <strong className="font-mono text-2xl font-bold tracking-tight tabular-nums">{value}</strong>
            <span className="text-sm font-medium text-muted-foreground">{suffix}</span>
          </div>
          <p className="mt-1.5 truncate text-xs leading-5 text-muted-foreground" title={description}>{description}</p>
        </div>
      </div>
    </div>
  )
}

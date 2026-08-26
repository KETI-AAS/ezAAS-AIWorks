"use client"

import { ArrowRight, Check, ChevronDown, Database, Scale, Tags, Upload } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  TRAINING_VALIDATION_RESULTS,
  type TrainingMappingRow,
} from "@/lib/training-data"
import { cn } from "@/lib/utils"

type ReviewDecision = "apply" | "ignore"

export function ValidationStep({
  mappingRows,
  onReupload,
  onNext,
}: {
  mappingRows: TrainingMappingRow[]
  onReupload: () => void
  onNext: () => void
}) {
  const [decisions, setDecisions] = useState<Record<string, ReviewDecision>>({})
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({})

  const reviewRows = mappingRows.filter((row) => row.status === "review")
  const normalColumns = mappingRows
    .filter((row) => row.status === "auto")
    .map((row) => row.column)
  const excludedColumns = mappingRows
    .filter((row) => row.status === "excluded")
    .map((row) => row.column)

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              4
            </span>
            <div>
              <h2 className="text-xl font-semibold">데이터 검증</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Semantic Mapping 결과를 확인하고, 검토가 필요한 컬럼의 적용 여부를 결정합니다.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="self-start rounded-full border-orange-200 bg-orange-50 px-3 py-1 text-orange-600">
            검토 필요 {reviewRows.length}
          </Badge>
        </div>

        <div className="px-5 py-5">
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_220px] gap-5 border-b border-border bg-muted/30 px-5 py-3 text-sm font-medium text-muted-foreground lg:grid">
              <span>검토 항목</span>
              <span>권장 조치</span>
              <span>적용 여부</span>
            </div>

            {reviewRows.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                검토가 필요한 매핑 항목이 없습니다.
              </div>
            ) : (
              reviewRows.map((row, index) => {
                const isOpen = openDetails[row.semanticId] ?? false
                const decision = decisions[row.semanticId] ?? "apply"
                const validationResult =
                  TRAINING_VALIDATION_RESULTS[index % TRAINING_VALIDATION_RESULTS.length]
                const ReviewIcon = [Tags, Scale, Database][index % 3]
                const iconStyle = [
                  "bg-violet-50 text-violet-600",
                  "bg-blue-50 text-blue-600",
                  "bg-orange-50 text-orange-600",
                ][index % 3]

                return (
                  <article key={row.semanticId} className="border-b border-border last:border-b-0">
                    <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_220px] lg:items-center">
                      <div className="flex min-w-0 items-start gap-4">
                        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconStyle)}>
                          <ReviewIcon className="size-5" strokeWidth={1.9} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                              {row.column}
                            </span>
                            <h3 className="text-[15px] font-semibold leading-none">{validationResult.title}</h3>
                            <Badge
                              variant="outline"
                              className="rounded-full border-orange-200 bg-orange-50 px-2 text-[11px] font-normal text-orange-600"
                            >
                              경고
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-5 text-muted-foreground">
                            {validationResult.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <p className="text-[15px] font-semibold leading-none">
                          {validationResult.recommendation}
                        </p>
                        <button
                          type="button"
                          onClick={() => setOpenDetails((current) => ({ ...current, [row.semanticId]: !isOpen }))}
                          className="flex w-fit items-center gap-1 text-sm font-medium text-primary"
                        >
                          상세 설명
                          <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                        </button>
                      </div>

                      <fieldset className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                        <legend className="sr-only">{row.column} 적용 여부</legend>
                        {(["apply", "ignore"] as const).map((value) => (
                          <label
                            key={value}
                            className={cn(
                              "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                              decision === value
                                ? "border-primary/40 bg-primary/5 text-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                            )}
                          >
                            <input
                              type="radio"
                              name={`decision-${row.semanticId}`}
                              checked={decision === value}
                              onChange={() => setDecisions((current) => ({ ...current, [row.semanticId]: value }))}
                              className="size-4 accent-primary"
                            />
                            {value === "apply" ? "권장 조치 적용" : "무시"}
                          </label>
                        ))}
                      </fieldset>
                    </div>

                    {isOpen && (
                      <div className="border-t border-border bg-muted/20 px-5 py-3 text-sm leading-6 text-muted-foreground lg:pl-[80px]">
                        {validationResult.detail}
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </div>

          <details className="group mt-4 rounded-xl border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
              <span className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="size-3.5" />
                </span>
                <span>
                  <span className="font-semibold">정상 컬럼 ({normalColumns.length})</span>
                  <span className="ml-2 text-sm text-muted-foreground">자동 매핑이 완료된 컬럼</span>
                </span>
              </span>
              <ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
              {normalColumns.map((column) => (
                <span key={column} className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <Check className="size-3.5" />
                  {column}
                </span>
              ))}
            </div>
          </details>

          <details className="group mt-4 rounded-xl border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
              <span className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  −
                </span>
                <span>
                  <span className="font-semibold">제외 컬럼 ({excludedColumns.length})</span>
                  <span className="ml-2 text-sm text-muted-foreground">학습 데이터에서 사용하지 않는 컬럼</span>
                </span>
              </span>
              <ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
              {excludedColumns.map((column) => (
                <span key={column} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {column}
                </span>
              ))}
            </div>
          </details>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={onReupload} className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 sm:min-w-56">
            <Upload className="size-4" />
            데이터 재업로드
          </Button>
          <Button onClick={onNext} className="sm:min-w-56">
            다음: 자동 전처리 실행
            <ArrowRight />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import {
  ArrowLeft,
  ArrowRight,
  Info,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  TRAINING_MAPPING_ROWS,
  UPLOAD_PREVIEW_COLUMNS,
  type TrainingMappingRow,
  type TrainingMappingStatus,
} from "@/lib/training-data"
import { cn } from "@/lib/utils"

const MAPPING_COLUMNS = Array.from(
  new Set([
    ...UPLOAD_PREVIEW_COLUMNS,
    ...TRAINING_MAPPING_ROWS.map((row) => row.column),
  ]),
)

function confidenceColor(value: number): string {
  if (value >= 0.8) return "bg-emerald-500"
  if (value >= 0.5) return "bg-amber-500"
  return "bg-red-500"
}

function StatusBadge({ status }: { status: TrainingMappingStatus }) {
  if (status === "auto") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
        자동 매핑
      </Badge>
    )
  }
  if (status === "review") {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-500">
        검토 필요
      </Badge>
    )
  }
  return <Badge variant="secondary">제외</Badge>
}

export function SemanticMappingStep({
  mappingRows,
  onMappingRowsChange,
  onBack,
  onNext,
}: {
  mappingRows: TrainingMappingRow[]
  onMappingRowsChange: (rows: TrainingMappingRow[]) => void
  onBack: () => void
  onNext: () => void
}) {
  const autoCount = mappingRows.filter((row) => row.status === "auto").length
  const reviewCount = mappingRows.filter((row) => row.status === "review").length
  const excludedCount = mappingRows.filter((row) => row.status === "excluded").length

  const updateMapping = (
    semanticId: string,
    updates: Partial<(typeof mappingRows)[number]>,
  ) => {
    onMappingRowsChange(
      mappingRows.map((row) =>
        row.semanticId === semanticId ? { ...row, ...updates } : row,
      ),
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 py-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              3
            </span>
            <div>
              <h2 className="text-lg font-semibold">Semantic Mapping (자동 전처리)</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                모델 입력 컬럼과 업로드한 데이터 컬럼을 자동으로 매핑합니다.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
              자동 매핑 {autoCount}
            </Badge>
            <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-500">
              검토 필요 {reviewCount}
            </Badge>
            <Badge variant="secondary">제외 {excludedCount}</Badge>
          </div>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1fr_300px]">
          {/* Mapping table */}
          <div className="min-w-0 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">
                    모델 입력 컬럼
                  </th>
                  <th className="px-3 py-2.5 font-medium">의미</th>
                  <th className="px-3 py-2.5 font-medium">선택된 컬럼</th>
                  <th className="px-3 py-2.5 font-medium">타입</th>
                  <th className="px-3 py-2.5 font-medium">신뢰도</th>
                  <th className="px-3 py-2.5 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {mappingRows.map((row) => (
                  <tr
                    key={row.semanticId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-3 font-mono text-xs">
                      {row.semanticId.replace("IDTA:Property:", "")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {row.meaning}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={row.column}
                        aria-label={`${row.meaning} 매핑 컬럼`}
                        className="h-8 min-w-32 rounded-md border border-input bg-background px-2 font-mono text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        onChange={(event) =>
                          updateMapping(row.semanticId, {
                            column: event.target.value,
                            confidence: 0.75,
                            status: "review",
                          })
                        }
                      >
                        {MAPPING_COLUMNS.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      {row.type}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex w-24 flex-col gap-1">
                        <span className="font-mono text-xs tabular-nums">
                          {row.confidence.toFixed(2)}
                        </span>
                        <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              confidenceColor(row.confidence),
                            )}
                            style={{ width: `${row.confidence * 100}%` }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-24 items-center">
                        <StatusBadge status={row.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Guide panel */}
          <aside className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Info className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Semantic Mapping 안내</h3>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              모델 입력 컬럼과 업로드한 데이터 컬럼의 이름, 단위, 데이터 타입 및 값 분포를 비교하여 자동으로 매핑합니다.
            </p>
            <div>
              <p className="mb-2 text-xs font-medium">매핑 기준</p>
              <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                {["컬럼 의미", "컬럼명 유사도", "단위 일치", "데이터 타입", "값 분포 및 통계"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <Separator />
            <div>
              <p className="mb-2 text-xs font-medium">신뢰도 기준</p>
              <ul className="flex flex-col gap-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">0.80–1.00 매우 높음, 자동 매핑 권장</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">0.50–0.79 보통, 검토 권장</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">0.00–0.49 낮음, 검토 필요</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft />
            이전 단계
          </Button>
          <Button onClick={onNext}>
            다음: 데이터 검증
            <ArrowRight />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

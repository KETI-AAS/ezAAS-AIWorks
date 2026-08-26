"use client"

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleCheck,
  Clock3,
  Database,
  FileImage,
  LoaderCircle,
  Minus,
  Play,
  Plus,
  Power,
  RotateCcw,
  Server,
  Target,
  UploadCloud,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  getTaskThumbnail,
  type Dataset,
  type DatasetColumn,
  type Model,
} from "@/lib/registry-data"
import { cn } from "@/lib/utils"

type InstanceStatus = "provisioning" | "running" | "expired"
type ExecutionStatus = "idle" | "running" | "complete"

const SESSION_SECONDS = 30 * 60

const STEPS = ["입력값 작성", "추론 실행", "결과 확인"] as const

function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

function inputType(column: DatasetColumn): React.HTMLInputTypeAttribute {
  if (column.type === "number") return "number"
  if (column.type === "datetime") return "datetime-local"
  return "text"
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="grid grid-cols-3 items-center gap-2 sm:gap-4">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <li key={label} className="relative flex min-w-0 items-center">
            <div className="relative z-10 flex min-w-0 items-center gap-2 bg-background pr-2 sm:gap-2.5 sm:pr-4">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  isComplete && "border-primary/20 bg-primary/10 text-primary",
                  !isComplete && !isCurrent &&
                    "border-border bg-muted/60 text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="size-3.5" /> : stepNumber}
              </span>
              <span
                className={cn(
                  "truncate text-xs sm:text-sm",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isComplete
                      ? "font-medium text-foreground/80"
                      : "font-medium text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <span className="absolute left-6 right-0 top-1/2 h-px -translate-y-1/2 bg-border" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function ModelDeployWorkbench({
  model,
  dataset,
}: {
  model: Model
  dataset: Dataset
}) {
  const emptyValues = useMemo(
    () => Object.fromEntries(dataset.columns.map((column) => [column.name, ""])),
    [dataset.columns]
  )

  const [instanceStatus, setInstanceStatus] =
    useState<InstanceStatus>("provisioning")
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_SECONDS)
  const [values, setValues] = useState<Record<string, string>>(emptyValues)
  const [inputRows, setInputRows] = useState<Record<string, string>[]>(() =>
    Array.from({ length: 1 }, () => ({ ...emptyValues }))
  )
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({})
  const [executionStatus, setExecutionStatus] =
    useState<ExecutionStatus>("idle")

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setInstanceStatus("running"), 1200)
    return () => window.clearTimeout(readyTimer)
  }, [])

  useEffect(() => {
    if (instanceStatus !== "running") return
    const countdown = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(countdown)
          setInstanceStatus("expired")
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(countdown)
  }, [instanceStatus])

  useEffect(() => {
    if (executionStatus !== "running") return
    const inferenceTimer = window.setTimeout(() => {
      setExecutionStatus("complete")
      toast.success("추론이 완료되었습니다")
    }, 1400)
    return () => window.clearTimeout(inferenceTimer)
  }, [executionStatus])

  const isRunning = instanceStatus === "running"
  const isExpired = instanceStatus === "expired"
  const currentStep = executionStatus === "complete" ? 3 : executionStatus === "running" ? 2 : 1
  const isImageInput = dataset.dataType === "이미지"
  const completedCount = isImageInput
    ? dataset.columns.filter((column) => values[column.name]?.trim().length > 0).length
    : inputRows.reduce(
        (count, row) =>
          count + dataset.columns.filter((column) => row[column.name]?.trim().length > 0).length,
        0
      )
  const totalInputCount = isImageInput
    ? dataset.columns.length
    : inputRows.length * dataset.columns.length
  const completionPercent = totalInputCount
    ? (completedCount / totalInputCount) * 100
    : 0
  const isClassPrediction = dataset.task !== "OCR"
  const predictionItems = isClassPrediction
    ? dataset.distribution.map((item) => item.label)
    : model.outputItems
  const canRun =
    isRunning &&
    (isImageInput
      ? dataset.columns.every(
          (column) => !column.required || values[column.name]?.trim().length > 0
        )
      : inputRows.length > 0 &&
        inputRows.every((row) =>
          dataset.columns.every(
            (column) => !column.required || row[column.name]?.trim().length > 0
          )
        ))

  const runInference = () => {
    if (!canRun) return
    setExecutionStatus("running")
  }

  const selectImageFile = (columnName: string, file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 선택할 수 있습니다")
      return
    }
    setSelectedFiles((current) => ({ ...current, [columnName]: file }))
    setValues((current) => ({ ...current, [columnName]: file.name }))
  }

  const restart = () => {
    setValues(emptyValues)
    setInputRows(Array.from({ length: 3 }, () => ({ ...emptyValues })))
    setSelectedRows([])
    setSelectedFiles({})
    setExecutionStatus("idle")
  }

  const updateRowValue = (rowIndex: number, columnName: string, value: string) => {
    setInputRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? { ...row, [columnName]: value } : row
      )
    )
  }

  const handleTablePaste = (
    event: React.ClipboardEvent<HTMLInputElement>,
    startRowIndex: number,
    startColumnIndex: number,
  ) => {
    const clipboardText = event.clipboardData.getData("text")
    const trimmedText = clipboardText.replace(/(?:\r?\n)+$/, "")
    const delimiter = trimmedText.includes("\t")
      ? "\t"
      : trimmedText.includes(",")
        ? ","
        : null
    const pastedRows = trimmedText
      .split(/\r?\n/)
      .map((row) => (delimiter ? row.split(delimiter) : [row]))

    const isMultiCellPaste = pastedRows.length > 1 || pastedRows[0]?.length > 1
    if (!isMultiCellPaste) return

    event.preventDefault()
    setInputRows((current) => {
      const requiredRowCount = startRowIndex + pastedRows.length
      const nextRows = current.map((row) => ({ ...row }))

      while (nextRows.length < requiredRowCount) {
        nextRows.push({ ...emptyValues })
      }

      pastedRows.forEach((pastedRow, rowOffset) => {
        pastedRow.forEach((pastedValue, columnOffset) => {
          const column = dataset.columns[startColumnIndex + columnOffset]
          if (!column) return
          nextRows[startRowIndex + rowOffset][column.name] = String(pastedValue)
        })
      })

      return nextRows
    })
  }

  const addRow = () => {
    setInputRows((current) => [...current, { ...emptyValues }])
  }

  const deleteSelectedRows = () => {
    if (!selectedRows.length) return
    setInputRows((current) =>
      current.filter((_, index) => !selectedRows.includes(index))
    )
    setSelectedRows([])
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative hidden size-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted sm:block">
                <Image
                  src={getTaskThumbnail(model.task)}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Inference Test</Badge>
                  <Badge variant="secondary" className="font-mono">
                    {model.version}
                  </Badge>
                </div>
                <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                  {model.name}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  연결된 데이터셋의 컬럼에 값을 입력해 모델의 추론 결과를 확인합니다.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/models/${model.id}`} />}
              >
                모델 상세
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setInstanceStatus("expired")
                  setRemainingSeconds(0)
                  toast.info("추론 인스턴스가 종료되었습니다")
                }}
                disabled={isExpired}
              >
                <Power />
                인스턴스 종료
              </Button>
            </div>
          </div>

          <Card size="sm">
            <CardContent className="flex flex-col gap-4 py-1 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {instanceStatus === "provisioning" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : isExpired ? (
                    <Power className="size-4" />
                  ) : (
                    <Activity className="size-4" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {instanceStatus === "provisioning"
                      ? "추론 환경을 준비하고 있습니다"
                      : isExpired
                        ? "인스턴스가 종료되었습니다"
                        : "인스턴스가 실행 중입니다"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {model.framework} · {model.architecture} · Shared GPU
                  </p>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden h-9 lg:block" />

              <div className="ml-auto flex items-center gap-3">
                <Clock3 className="size-4 text-muted-foreground" />
                <div>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {formatRemainingTime(remainingSeconds)}
                  </p>
                  <p className="text-xs text-muted-foreground">남은 사용 시간</p>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {isExpired ? (
          <Alert>
            <Power />
            <AlertTitle>추론 환경이 종료되었습니다</AlertTitle>
            <AlertDescription>
              모델 또는 Asset Pair 상세 화면에서 추론하기를 다시 눌러 새 세션을 시작할 수 있습니다.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {executionStatus !== "complete" ? (
              <Card className="overflow-hidden">
                <div className="border-b border-border bg-background px-5 py-3.5 sm:px-6">
                  <StepIndicator currentStep={currentStep} />
                </div>

                <div className="border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-primary">
                        <Database className="size-4" />
                        {dataset.name}
                      </div>
                      <h2 className="text-xl font-semibold">
                        {dataset.dataType === "시계열"
                          ? "센서 측정값을 입력해주세요"
                          : "모델 입력값을 입력해주세요"}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        모델이 판단에 사용하는 입력값만 표시됩니다. 모든 항목을 입력하면 추론할 수 있습니다.
                      </p>
                    </div>
                    <div className="min-w-36 rounded-xl border border-primary/15 bg-background/80 px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">입력 완료</span>
                        <strong className="font-mono text-primary">
                          {completedCount} / {totalInputCount}
                        </strong>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary transition-[width] duration-300"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="flex flex-col gap-6 py-6">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0">
                      {isImageInput ? (
                        <div className="flex flex-col gap-3">
                          {dataset.columns.map((column, index) => {
                            const inputId = `inference-${column.name}`
                            const hasValue = values[column.name]?.trim().length > 0

                            return (
                              <div
                                key={column.name}
                                className={cn(
                                  "grid gap-4 rounded-xl border p-4 transition-colors sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center",
                                  hasValue
                                    ? "border-primary/30 bg-primary/[0.025]"
                                    : "border-border bg-card"
                                )}
                              >
                                <div className="flex min-w-0 items-start gap-3">
                                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <label htmlFor={inputId} className="flex flex-wrap items-center gap-2 font-semibold">
                                      {column.label}
                                      {column.required ? <span className="text-destructive">*</span> : null}
                                    </label>
                                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{column.name}</p>
                                  </div>
                                </div>
                                <div>
                                  <input
                                    id={inputId}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    disabled={executionStatus === "running"}
                                    onChange={(event) => {
                                      selectImageFile(column.name, event.target.files?.[0])
                                      event.target.value = ""
                                    }}
                                  />
                                  <label
                                    htmlFor={inputId}
                                    className={cn(
                                      "flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors",
                                      selectedFiles[column.name]
                                        ? "border-primary/40 bg-primary/5"
                                        : "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
                                      executionStatus === "running" && "pointer-events-none opacity-60"
                                    )}
                                  >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                      {selectedFiles[column.name] ? <FileImage className="size-5" /> : <UploadCloud className="size-5" />}
                                    </span>
                                    <span className="min-w-0">
                                      {selectedFiles[column.name] ? (
                                        <>
                                          <span className="block truncate text-sm font-semibold">{selectedFiles[column.name].name}</span>
                                          <span className="mt-0.5 block text-xs text-muted-foreground">
                                            {formatFileSize(selectedFiles[column.name].size)} · 클릭하여 변경
                                          </span>
                                        </>
                                      ) : (
                                        <span className="block text-sm font-semibold">이미지 파일 선택</span>
                                      )}
                                    </span>
                                  </label>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-border">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-3">
                            <div>
                              <span className="text-sm font-semibold">입력 데이터</span>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Excel 또는 스프레드시트에서 복사한 값을 셀에 붙여넣을 수 있습니다.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={executionStatus === "running"}>
                                <Plus className="size-4" />
                                행 추가
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={deleteSelectedRows} disabled={!selectedRows.length || executionStatus === "running"}>
                                <Minus className="size-4" />
                                선택 행 삭제
                              </Button>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] border-collapse text-sm">
                              <thead className="bg-muted/35">
                                <tr>
                                  <th className="w-12 border-b border-r border-border px-3 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      aria-label="전체 행 선택"
                                      checked={inputRows.length > 0 && selectedRows.length === inputRows.length}
                                      onChange={(event) =>
                                        setSelectedRows(event.target.checked ? inputRows.map((_, index) => index) : [])
                                      }
                                    />
                                  </th>
                                  <th className="w-14 border-b border-r border-border px-3 py-3 text-center font-semibold">No.</th>
                                  {dataset.columns.map((column) => (
                                    <th key={column.name} className="min-w-44 border-b border-r border-border px-4 py-3 text-left last:border-r-0">
                                      <div className="font-semibold">
                                        {column.label}{column.unit ? ` (${column.unit})` : ""}
                                        {column.required ? <span className="ml-1 text-destructive">*</span> : null}
                                      </div>
                                      <div className="mt-1 font-mono text-xs font-normal text-muted-foreground">{column.name}</div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {inputRows.map((row, rowIndex) => (
                                  <tr key={rowIndex} className="bg-background">
                                    <td className="border-b border-r border-border px-3 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        aria-label={`${rowIndex + 1}행 선택`}
                                        checked={selectedRows.includes(rowIndex)}
                                        onChange={(event) =>
                                          setSelectedRows((current) =>
                                            event.target.checked
                                              ? [...current, rowIndex]
                                              : current.filter((index) => index !== rowIndex)
                                          )
                                        }
                                      />
                                    </td>
                                    <td className="border-b border-r border-border px-3 py-3 text-center font-mono text-muted-foreground">{rowIndex + 1}</td>
                                    {dataset.columns.map((column, columnIndex) => (
                                      <td key={column.name} className="border-b border-r border-border p-2 last:border-r-0">
                                        <Input
                                          type={inputType(column)}
                                          step={column.type === "number" ? "any" : undefined}
                                          value={row[column.name] ?? ""}
                                          onChange={(event) => updateRowValue(rowIndex, column.name, event.target.value)}
                                          onPaste={(event) => handleTablePaste(event, rowIndex, columnIndex)}
                                          disabled={executionStatus === "running"}
                                          placeholder="값 입력"
                                          className="h-10 min-w-36 bg-background"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    <aside className="h-fit rounded-xl border border-border bg-muted/25 p-5 lg:sticky lg:top-6">
                      <div className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Target className="size-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold">모델이 반환하는 결과</h3>
                          <p className="text-xs text-muted-foreground">
                            {isClassPrediction ? `정답 라벨 · ${dataset.classCount}개` : "출력 항목"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-2">
                        {predictionItems.map((item) => (
                          <div key={item} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                            <span className="size-2 rounded-full bg-primary" />
                            {item}
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-xs leading-5 text-muted-foreground">
                        위 항목은 입력값이 아니라 모델이 입력 데이터를 분석해 반환하는 결과입니다.
                      </p>
                    </aside>
                  </div>

                  {executionStatus === "running" && (
                    <Alert>
                      <LoaderCircle className="animate-spin" />
                      <AlertTitle>추론을 실행하고 있습니다</AlertTitle>
                      <AlertDescription>
                        입력값을 전처리하고 모델 결과를 생성하는 중입니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Separator />

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/models/${model.id}`} />}
                    >
                      <ArrowLeft />
                      이전 단계
                    </Button>
                    <Button
                      size="lg"
                      onClick={runInference}
                      disabled={!canRun || executionStatus === "running"}
                    >
                      {executionStatus === "running" ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Play />
                      )}
                      입력값으로 추론하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <InferenceResult
                model={model}
                dataset={dataset}
                values={isImageInput ? values : inputRows[inputRows.length - 1] ?? emptyValues}
                onRestart={restart}
              />
            )}
          </>
        )}

        <Alert>
          <Server />
          <AlertTitle>일회용 추론 환경</AlertTitle>
          <AlertDescription>
            세션이 종료되면 입력값과 추론 결과가 삭제됩니다. 운영 배포 용도로는 사용할 수 없습니다.
          </AlertDescription>
        </Alert>
    </div>
  )
}

function InferenceResult({
  model,
  dataset,
  values,
  onRestart,
}: {
  model: Model
  dataset: Dataset
  values: Record<string, string>
  onRestart: () => void
}) {
  if (dataset.dataType === "이미지") {
    return (
      <ImageInferenceResult
        model={model}
        onRestart={onRestart}
      />
    )
  }

  if (dataset.id !== "sensor-logs") {
    return (
      <GenericInferenceResult
        model={model}
        dataset={dataset}
        values={values}
        onRestart={onRestart}
      />
    )
  }

  const prediction = buildPrediction(values)

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-background px-5 py-3.5 sm:px-6">
        <StepIndicator currentStep={3} />
      </div>
      <CardContent className="flex flex-col gap-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CircleCheck className="size-3.5" />
                추론 실행 완료
              </Badge>
            </div>
            <h2 className="text-2xl font-semibold">설비 상태 판정 결과</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              입력한 센서값을 분석한 모델의 예측 결과입니다.
            </p>
          </div>
          <Button onClick={onRestart}>
            <RotateCcw />
            다른 값으로 다시 실행
          </Button>
        </div>

        <section
          className={cn(
            "grid gap-5 rounded-2xl border p-6 md:grid-cols-[minmax(0,1fr)_180px] md:items-center",
            prediction.isNormal
              ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/25"
              : "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/25"
          )}
        >
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-full",
                prediction.isNormal
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-500 text-white"
              )}
            >
              {prediction.isNormal ? (
                <CircleCheck className="size-6" />
              ) : (
                <AlertTriangle className="size-6" />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                최종 판정
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-3xl font-bold tracking-tight">{prediction.label}</h3>
                <span className="text-lg font-semibold text-muted-foreground">
                  {prediction.koreanLabel}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {prediction.description}
              </p>
              <p className="mt-3 text-sm font-semibold">{prediction.recommendation}</p>
            </div>
          </div>
          <div className="rounded-xl border border-background/80 bg-background/80 p-4 text-center shadow-sm">
            <p className="font-mono text-4xl font-bold tabular-nums">
              {prediction.confidence}%
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">예측 신뢰도</p>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <ResultMetric label="이상 점수" value={prediction.anomalyScore.toFixed(2)} description="1에 가까울수록 이상 가능성이 높음" />
          <ResultMetric label="예상 잔여 수명" value={prediction.remainingLife} description="현재 센서 상태 기준 추정" />
          <ResultMetric label="추론 시간" value="42 ms" description="모델 처리에 걸린 시간" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-xl border border-border p-5">
            <h3 className="mb-3 text-sm font-semibold">입력한 센서값</h3>
            <dl className="flex flex-col divide-y divide-border">
              {dataset.columns.map((column) => (
                <div key={column.name} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <dt>
                    <p className="font-medium">{column.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{column.name}</p>
                  </dt>
                  <dd className="whitespace-nowrap font-mono text-base font-semibold">
                    {values[column.name]}
                    {column.unit ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{column.unit}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-border p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">클래스별 예측 확률</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                모델이 네 가지 설비 상태일 가능성을 비교한 결과입니다.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {prediction.probabilities.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className={cn("font-medium", item.label === prediction.label && "text-primary")}>{item.label}</span>
                    <span className="font-mono font-semibold tabular-nums">{item.value}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full transition-[width] duration-500",
                        item.label === prediction.label ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}

function ImageInferenceResult({
  model,
  onRestart,
}: {
  model: Model
  onRestart: () => void
}) {
  const isOcr = model.task === "OCR"
  const isClassification = model.task === "Classification"
  const isObjectDetection = model.task === "Object Detection"
  const resultHeading = isOcr
    ? "문서에서 텍스트를 인식했습니다"
    : model.task === "Segmentation"
      ? "결함 영역을 분할했습니다"
      : model.task === "Classification"
        ? "이미지 분류를 완료했습니다"
        : "이미지에서 객체를 검출했습니다"
  const resultCaption = isOcr
    ? "인식 영역과 문자 위치가 표시된 결과"
    : model.resultType === "Segmentation"
      ? "픽셀 단위 마스크가 적용된 결과"
      : "모델 분석 결과가 표시된 이미지"

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-background px-5 py-3.5 sm:px-6">
        <StepIndicator currentStep={3} />
      </div>
      <CardContent className="flex flex-col gap-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="mb-2 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CircleCheck className="size-3.5" />
              추론 실행 완료
            </Badge>
            <h2 className="text-2xl font-semibold">{resultHeading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{model.outputDescription}</p>
          </div>
          <Button onClick={onRestart}>
            <RotateCcw />
            다른 이미지로 다시 실행
          </Button>
        </div>

        {isOcr ? (
          <div className="flex flex-col gap-5">
            <ResultImagePanel
              src={model.resultImage || getTaskThumbnail(model.task)}
              title="문자 위치 검출 결과"
              caption={resultCaption}
              badge="Bounding Box + OCR"
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-xl border border-border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">인식된 텍스트</h3>
                    <p className="mt-1 text-xs text-muted-foreground">검출된 문자 영역에서 추출한 내용입니다.</p>
                  </div>
                  <Badge variant="secondary">12개 영역</Badge>
                </div>
                <div className="mt-4 rounded-lg bg-muted/40 p-4 font-mono text-sm leading-7">
                  Capability Flow<br />
                  AI Asset Pair<br />
                  Dataset → Model → Inference
                </div>
              </section>
              <section className="grid grid-cols-3 gap-3 rounded-xl border border-border p-4 lg:grid-cols-1">
                <ImageResultMetric label="평균 신뢰도" value="98.1%" />
                <ImageResultMetric label="감지 영역" value="12" />
                <ImageResultMetric label="인식 문자" value="46" />
              </section>
            </div>
          </div>
        ) : isClassification ? (
          <div className="flex flex-col gap-5">
            <section className="rounded-2xl border border-primary/20 bg-primary/[0.025] p-8 text-center md:p-12">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">예측 클래스</p>
              <h3 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">Scratch</h3>
              <p className="mt-2 text-lg text-muted-foreground">스크래치 결함</p>
              <Badge className="mt-5 text-base">신뢰도 97.2%</Badge>
            </section>
            <div className="grid gap-3 sm:grid-cols-2">
              <ImageResultMetric label="예측 신뢰도" value="97.2%" />
              <ImageResultMetric label="분류 클래스" value="Scratch" />
            </div>
          </div>
        ) : isObjectDetection ? (
          <div className="flex flex-col gap-5">
            <DetectionResultPanel src={model.resultImage || getTaskThumbnail(model.task)} />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold">검출된 결함</h3>
                <p className="mt-1 text-xs text-muted-foreground">박스 라벨과 같은 색상으로 결함 종류를 구분합니다.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {DETECTION_SUMMARY.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span className={cn("size-2.5 rounded-full", item.dotClass)} />
                        {item.label}
                      </span>
                      <Badge variant="secondary">{item.count}건</Badge>
                    </div>
                  ))}
                </div>
              </section>
              <section className="grid grid-cols-2 gap-3 rounded-xl border border-border p-4">
                <ImageResultMetric label="검출 결함" value="7" />
                <ImageResultMetric label="평균 신뢰도" value="58%" />
              </section>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <ResultImagePanel
              src={model.resultImage || getTaskThumbnail(model.task)}
              title="모델 처리 결과"
              caption={resultCaption}
              badge={model.resultType}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultMetric label="평균 신뢰도" value={`${model.accuracy}%`} description="검출 결과의 평균 신뢰도" />
              <ResultMetric label="결과 유형" value={model.resultType} description="이미지에 표시된 모델 출력" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const DETECTIONS = [
  { label: "Scratch", confidence: "0.65", left: "17%", top: "12%", className: "bg-blue-600" },
  { label: "Scratch", confidence: "0.38", left: "60%", top: "19%", className: "bg-blue-600" },
  { label: "Dent", confidence: "0.52", left: "14%", top: "34%", className: "bg-emerald-600" },
  { label: "Dent", confidence: "0.92", left: "37%", top: "30%", className: "bg-emerald-600" },
  { label: "Paint Defect", confidence: "0.52", left: "20%", top: "57%", className: "bg-amber-600" },
  { label: "Contamination", confidence: "0.74", left: "85%", top: "49%", className: "bg-violet-600" },
  { label: "Contamination", confidence: "0.32", left: "68%", top: "69%", className: "bg-violet-600" },
] as const

const DETECTION_SUMMARY = [
  { label: "Scratch", count: 2, dotClass: "bg-blue-600" },
  { label: "Dent", count: 2, dotClass: "bg-emerald-600" },
  { label: "Paint Defect", count: 1, dotClass: "bg-amber-600" },
  { label: "Contamination", count: 2, dotClass: "bg-violet-600" },
] as const

function DetectionResultPanel({ src }: { src: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">결함 검출 결과</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">각 박스에 결함 종류와 신뢰도가 표시됩니다.</p>
        </div>
        <Badge variant="outline">Bounding Box</Badge>
      </div>
      <div className="bg-muted p-3 md:p-6">
        <div className="relative mx-auto aspect-square w-full max-w-4xl overflow-hidden bg-background">
          <Image
            src={src}
            alt="결함 종류와 신뢰도가 표시된 Bounding Box 결과"
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 896px"
          />
          {DETECTIONS.map((detection, index) => (
            <span
              key={`${detection.label}-${index}`}
              className={cn(
                "absolute z-10 -translate-y-full whitespace-nowrap rounded-t px-2 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-xs",
                detection.className
              )}
              style={{ left: detection.left, top: detection.top }}
            >
              {detection.label} {detection.confidence}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="border-t border-border bg-background px-4 py-3 text-xs text-muted-foreground">
        클래스명 · 신뢰도 형식으로 표시된 모델 검출 결과
      </figcaption>
    </figure>
  )
}

function ResultImagePanel({
  src,
  title,
  caption,
  badge,
}: {
  src: string
  title: string
  caption: string
  badge?: string
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
      <div className="relative aspect-video bg-muted">
        <Image
          src={src}
          alt={title}
          fill
          className="object-contain"
          sizes="(max-width: 1200px) 100vw, 1100px"
        />
      </div>
      <figcaption className="border-t border-border bg-background px-4 py-3 text-xs text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  )
}

function ImageResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="font-mono text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

type PredictionLabel = "Normal" | "Bearing Wear" | "Misalignment" | "Overheat"

type PredictionResult = {
  label: PredictionLabel
  koreanLabel: string
  confidence: number
  anomalyScore: number
  remainingLife: string
  description: string
  recommendation: string
  isNormal: boolean
  probabilities: { label: PredictionLabel; value: number }[]
}

function buildPrediction(values: Record<string, string>): PredictionResult {
  const temperature = Number(values.TEMP_01 ?? 0)
  const vibration = Number(values.VIB_VEL ?? 0)
  const current = Number(values.MOTOR_A ?? 0)

  let label: PredictionLabel = "Normal"
  if (temperature >= 80) label = "Overheat"
  else if (vibration >= 10) label = "Misalignment"
  else if (current >= 12 || vibration >= 7) label = "Bearing Wear"

  const details: Record<PredictionLabel, Omit<PredictionResult, "label" | "probabilities">> = {
    Normal: {
      koreanLabel: "정상",
      confidence: 91,
      anomalyScore: 0.08,
      remainingLife: "120일 이상",
      description: "입력된 센서값에서 뚜렷한 이상 징후가 감지되지 않았습니다.",
      recommendation: "현재 점검 주기를 유지하세요.",
      isNormal: true,
    },
    "Bearing Wear": {
      koreanLabel: "베어링 마모",
      confidence: 88,
      anomalyScore: 0.82,
      remainingLife: "약 21일",
      description: "진동과 모터 전류 패턴에서 베어링 마모 가능성이 감지되었습니다.",
      recommendation: "베어링 상태를 점검하고 교체 일정을 검토하세요.",
      isNormal: false,
    },
    Misalignment: {
      koreanLabel: "축 정렬 불량",
      confidence: 92,
      anomalyScore: 0.91,
      remainingLife: "약 14일",
      description: "진동값이 정상 범위를 크게 벗어나 축 정렬 불량 가능성이 높습니다.",
      recommendation: "설비 운전을 줄이고 축 정렬 상태를 우선 점검하세요.",
      isNormal: false,
    },
    Overheat: {
      koreanLabel: "과열",
      confidence: 94,
      anomalyScore: 0.95,
      remainingLife: "약 7일",
      description: "설비 온도가 기준 범위를 초과해 과열 상태로 판단됩니다.",
      recommendation: "설비를 즉시 점검하고 냉각 계통을 확인하세요.",
      isNormal: false,
    },
  }

  const probabilitySets: Record<PredictionLabel, number[]> = {
    Normal: [91, 4, 3, 2],
    "Bearing Wear": [4, 88, 6, 2],
    Misalignment: [3, 4, 92, 1],
    Overheat: [2, 2, 2, 94],
  }
  const labels: PredictionLabel[] = ["Normal", "Bearing Wear", "Misalignment", "Overheat"]

  return {
    label,
    ...details[label],
    probabilities: labels.map((item, index) => ({
      label: item,
      value: probabilitySets[label][index],
    })),
  }
}

function GenericInferenceResult({
  model,
  dataset,
  values,
  onRestart,
}: {
  model: Model
  dataset: Dataset
  values: Record<string, string>
  onRestart: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-background px-5 py-3.5 sm:px-6">
        <StepIndicator currentStep={3} />
      </div>
      <CardContent className="flex flex-col gap-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="mb-2 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CircleCheck className="size-3.5" />
              추론 실행 완료
            </Badge>
            <h2 className="text-2xl font-semibold">모델 결과가 생성되었습니다</h2>
            <p className="mt-1 text-sm text-muted-foreground">{model.outputDescription}</p>
          </div>
          <Button onClick={onRestart}>
            <RotateCcw />
            다른 값으로 다시 실행
          </Button>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-border p-5">
            <h3 className="mb-3 text-sm font-semibold">입력값</h3>
            <dl className="flex flex-col divide-y divide-border">
              {dataset.columns.map((column) => (
                <div key={column.name} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <dt className="font-medium">{column.label}</dt>
                  <dd className="max-w-[60%] truncate font-mono text-xs">{values[column.name]}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-xl border border-border bg-muted/20 p-5">
            <p className="text-xs font-medium text-muted-foreground">모델 출력</p>
            <p className="mt-2 text-xl font-semibold">{model.output}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{model.outputDescription}</p>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultMetric({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/25 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

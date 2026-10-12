"use client"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Columns3,
  FileSpreadsheet,
  Rows3,
  Trash2,
  UploadCloud,
} from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UPLOAD_PREVIEW_COLUMNS, UPLOAD_PREVIEW_ROWS } from "@/lib/training-data"
import { cn } from "@/lib/utils"

export interface UploadedFile {
  name: string
  sizeLabel: string
  extension: string
  columnCount: number
  rowCount: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const ACCEPTED = [".csv", ".xlsx", ".xls"]

export function UploadStep({
  file,
  onFileChange,
  onBack,
  onNext,
}: {
  file: UploadedFile | null
  onFileChange: (file: UploadedFile | null) => void
  onBack: () => void
  onNext: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = (raw: File) => {
    const lower = raw.name.toLowerCase()
    const ext = lower.slice(lower.lastIndexOf("."))
    if (!ACCEPTED.includes(ext)) {
      toast.error("CSV 또는 XLSX 파일만 업로드할 수 있습니다")
      return
    }
    // Mock derived metadata — real parsing would populate these values.
    onFileChange({
      name: raw.name,
      sizeLabel: formatBytes(raw.size),
      extension: ext.replace(".", "").toUpperCase(),
      columnCount: 45,
      rowCount: 12543,
    })
    toast.success("데이터 업로드가 완료되었습니다")
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) processFile(dropped)
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 py-2">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            2
          </span>
          <div>
            <h2 className="text-lg font-semibold">데이터 업로드</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              추가 학습에 사용할 데이터를 업로드하세요.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) processFile(f)
            e.target.value = ""
          }}
        />

        {!file ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="size-6" />
            </span>
            <div>
              <p className="font-medium">파일을 드래그하거나 클릭하여 업로드</p>
              <p className="mt-1 text-sm text-muted-foreground">
                CSV, XLSX 파일 지원 (최대 500MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-border p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSpreadsheet className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <Check className="size-4 shrink-0 text-emerald-500" />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {file.extension} 파일 · {file.sizeLabel}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="파일 삭제"
                onClick={() => onFileChange(null)}
              >
                <Trash2 />
              </Button>
            </div>

            {/* Data summary */}
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">데이터 요약</h3>
                <PreviewDialog />
              </div>
              <div className="grid grid-cols-3 divide-x divide-border text-center">
                <SummaryStat
                  icon={<FileSpreadsheet className="size-4" />}
                  label="확장자"
                  value={file.extension}
                />
                <SummaryStat
                  icon={<Columns3 className="size-4" />}
                  label="컬럼 수"
                  value={String(file.columnCount)}
                />
                <SummaryStat
                  icon={<Rows3 className="size-4" />}
                  label="행 수"
                  value={file.rowCount.toLocaleString()}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft />
            이전 단계
          </Button>
          <Button onClick={onNext} disabled={!file}>
            다음: Semantic Mapping
            <ArrowRight />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </span>
      <span className="font-mono text-lg font-semibold tabular-nums">
        {value}
      </span>
    </div>
  )
}

function PreviewDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        미리보기
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>데이터 미리보기</DialogTitle>
          <DialogDescription>
            업로드한 데이터의 상위 5개 행을 표시합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {UPLOAD_PREVIEW_COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-medium text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {UPLOAD_PREVIEW_ROWS.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums",
                        cell !== "NORMAL" && /[A-Z]{2,}/.test(cell) && cell !== row[1]
                          ? "font-medium text-amber-600 dark:text-amber-500"
                          : "text-foreground",
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

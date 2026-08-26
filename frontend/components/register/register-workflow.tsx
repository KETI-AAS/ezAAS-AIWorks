"use client"

import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  Cpu,
  Database,
  FileJson,
  Link2,
  Lock,
  LoaderCircle,
  Server,
  Sparkles,
  Tag,
  UploadCloud,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AasViewer } from "@/components/registry/aas-viewer"
import type { AasEnvironment, TreeNode } from "@/lib/aas/aas-types"
import {
  analyzeAas,
  extractDatasetMeta,
  extractModelMeta,
  type AasAnalysis,
  type AssetKind,
} from "@/lib/aas/extract-metadata"
import { parseAasTree } from "@/lib/aas/parse-aas-tree"
import { sampleInstances, type SampleInstance } from "@/lib/aas/sample-instances"
import { startModelValidation } from "@/lib/model-validation-store"
import { assetPairs, models, taskTypes } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

/** Result of loading an AAS environment (upload or external import). */
type AasUpload =
  | { status: "empty" }
  | { status: "error"; fileName: string; message: string }
  | {
      status: "parsed"
      fileName: string
      fileSize: number
      tree: TreeNode
      env: AasEnvironment
      source: "file" | "import"
    }

const steps = [
  { id: 1, label: "AAS 업로드", icon: Boxes },
  { id: 2, label: "추출 · 입력", icon: Sparkles },
  { id: 3, label: "등록 확인", icon: Check },
]

type DatasetForm = {
  title: string
  author: string
  version: string
  summary: string
  detailType: string
  task: string
  license: string
  keywords: string
}

type ModelForm = {
  title: string
  author: string
  version: string
  summary: string
  framework: string
  task: string
  license: string
  keywords: string
  assetType: ModelAssetType
  artifactReference: string
  dependencyReference: string
}

type ModelAssetType =
  | "weights"
  | "checkpoint"
  | "adapter"
  | "graph"
  | "runtime"
  | "package"
  | "container"
  | "external"

type ModelAssetOption = {
  value: ModelAssetType
  label: string
  examples: string
  description: string
  source: "file" | "reference"
  accept?: string
  referenceLabel?: string
  referencePlaceholder?: string
  dependencyLabel?: string
  dependencyPlaceholder?: string
}

const modelAssetOptions: ModelAssetOption[] = [
  {
    value: "weights",
    label: "가중치",
    examples: ".pth, .pt, .safetensors",
    description: "학습된 텐서 값입니다. 추론에 사용할 모델 구조나 코드가 함께 필요합니다.",
    source: "file",
    accept: ".pth,.pt,.safetensors",
    dependencyLabel: "모델 구조 또는 코드 참조",
    dependencyPlaceholder: "예: registry://models/yolov8-code:v1",
  },
  {
    value: "checkpoint",
    label: "학습 체크포인트",
    examples: ".ckpt, .pt, .tar",
    description: "가중치와 학습 상태가 포함된 체크포인트입니다.",
    source: "file",
    accept: ".ckpt,.pt,.tar",
    dependencyLabel: "모델 구조 또는 학습 코드 참조",
    dependencyPlaceholder: "예: https://git.example.com/models/project",
  },
  {
    value: "adapter",
    label: "어댑터 / Delta",
    examples: "LoRA, PEFT adapter",
    description: "원본 모델과의 차이값입니다. 함께 사용할 Base Model이 필요합니다.",
    source: "file",
    accept: ".safetensors,.bin,.pt,.zip",
    dependencyLabel: "Base Model 참조",
    dependencyPlaceholder: "예: hf://organization/base-model@v1",
  },
  {
    value: "graph",
    label: "실행 그래프",
    examples: ".onnx, SavedModel",
    description: "연산 그래프와 가중치, 입출력 구조를 포함합니다. SavedModel은 ZIP으로 올려주세요.",
    source: "file",
    accept: ".onnx,.pb,.zip",
  },
  {
    value: "runtime",
    label: "런타임 전용 엔진",
    examples: ".engine, .tflite, OpenVINO IR",
    description: "특정 실행 환경에 최적화된 모델입니다. 필요한 런타임 정보를 함께 입력합니다.",
    source: "file",
    accept: ".engine,.tflite,.xml,.bin,.blob",
    dependencyLabel: "필요 런타임 / 실행 환경",
    dependencyPlaceholder: "예: TensorRT 10 · CUDA 12.4 · NVIDIA L4",
  },
  {
    value: "package",
    label: "모델 패키지",
    examples: "Hugging Face, MLflow, ZIP/TAR",
    description: "가중치, 설정, tokenizer, 코드 등을 하나의 압축 패키지로 등록합니다.",
    source: "file",
    accept: ".zip,.tar,.gz,.tgz",
  },
  {
    value: "container",
    label: "컨테이너",
    examples: "OCI / Docker image",
    description: "코드, 라이브러리, 모델이 포함된 컨테이너 이미지 위치를 등록합니다.",
    source: "reference",
    referenceLabel: "컨테이너 이미지 URI",
    referencePlaceholder: "예: registry.example.com/ai/model:1.0",
  },
  {
    value: "external",
    label: "외부 모델 참조",
    examples: "API URL, Registry URI",
    description: "파일 대신 외부 서비스 또는 모델 레지스트리의 위치와 버전을 등록합니다.",
    source: "reference",
    referenceLabel: "API URL 또는 Registry URI",
    referencePlaceholder: "예: https://api.example.com/models/v1 또는 registry://models/name@v1",
  },
]

const datasetAssetAccept = [
  ".zip", ".tar", ".gz", ".tgz",
  ".csv", ".tsv", ".parquet", ".xlsx", ".xls",
  ".json", ".jsonl", ".txt", ".xml", ".yaml", ".yml",
  ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff",
  ".wav", ".flac", ".mp3", ".ogg",
  ".mp4", ".avi", ".mov", ".mkv", ".webm",
  ".npy", ".npz",
].join(",")

/** Registration exposes only two visibility levels. */
const visibilityOptions = ["공개", "비공개"] as const

const defaultKeywordSuggestions = ["제조", "불량", "예측", "센서", "검사", "공정"]

const detailTypesByCategory: Record<string, string[]> = {
  "이미지 데이터": ["검사 이미지", "제품 이미지", "결함 이미지", "열화상 이미지"],
  "표형 데이터": ["공정 데이터", "센서 데이터", "진동 데이터", "시계열 데이터", "품질 데이터"],
  "오디오 데이터": ["음성 데이터", "설비 소음 데이터", "환경음 데이터"],
  "영상 데이터": ["검사 영상", "공정 영상", "CCTV 영상"],
  "텍스트 데이터": ["문서 데이터", "로그 데이터", "자연어 데이터"],
  "구조화 데이터": ["메타데이터", "이벤트 데이터", "트랜잭션 데이터"],
  "기타 데이터": ["센서 데이터", "공정 데이터", "복합 데이터"],
}

function dataCategoryFromFileType(fileType: string) {
  const normalized = fileType.trim().toLowerCase().split(/[./\\]/).filter(Boolean).pop() || ""
  if (["png", "jpg", "jpeg", "bmp", "gif", "tif", "tiff", "webp"].includes(normalized)) return "이미지 데이터"
  if (["csv", "tsv", "xls", "xlsx", "parquet"].includes(normalized)) return "표형 데이터"
  if (["wav", "mp3", "flac", "aac", "ogg"].includes(normalized)) return "오디오 데이터"
  if (["mp4", "avi", "mov", "mkv", "webm"].includes(normalized)) return "영상 데이터"
  if (["txt", "md", "pdf", "doc", "docx", "json", "jsonl", "xml", "yaml", "yml"].includes(normalized)) return "텍스트 데이터"
  return "기타 데이터"
}

async function inspectPyTorchStructure(file: File) {
  if (file.size < 4) return { valid: false, message: "파일이 비어 있거나 손상되었습니다." }

  const prefix = new Uint8Array(await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer())
  const header = prefix.subarray(0, 4)
  const isZip = header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04
  const isPickle = header[0] === 0x80 && header[1] >= 0x02 && header[1] <= 0x05
  const zipManifest = isZip ? new TextDecoder("latin1").decode(prefix) : ""
  const hasPyTorchEntry = /data\.pkl|constants\.pkl|archive\/version/.test(zipManifest)
  return (isZip && hasPyTorchEntry) || isPickle
    ? { valid: true, message: "PyTorch 모델 파일의 기본 구조가 확인되었습니다." }
    : { valid: false, message: "PyTorch 모델 헤더를 확인할 수 없습니다." }
}

function fileExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".")
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : ""
}

async function inspectModelArtifact(
  option: ModelAssetOption,
  file: File | null,
  artifactReference: string,
  dependencyReference: string,
) {
  if (option.source === "reference") {
    const reference = artifactReference.trim()
    const isExternal = option.value === "external"
      ? /^(https?:\/\/|registry:\/\/|hf:\/\/|s3:\/\/)/i.test(reference)
      : /^(?:[a-z0-9.-]+(?::[0-9]+)?\/)?[a-z0-9._/-]+(?::[a-z0-9._-]+|@sha256:[a-f0-9]+)$/i.test(reference)
    return isExternal
      ? { valid: true, message: `${option.label} 참조 형식이 확인되었습니다.` }
      : { valid: false, message: `${option.referenceLabel} 형식을 확인해 주세요.` }
  }

  if (!file) return { valid: false, message: "모델 자산 파일이 없습니다." }
  if (file.size < 4) return { valid: false, message: "파일이 비어 있거나 손상되었습니다." }

  const extension = fileExtension(file.name)
  const allowed = option.accept?.split(",").map((item) => item.trim().toLowerCase()) ?? []
  if (!allowed.includes(extension)) {
    return { valid: false, message: `${option.label}에서 지원하지 않는 파일 형식입니다.` }
  }

  if ([".pt", ".pth", ".ckpt"].includes(extension)) {
    const pytorch = await inspectPyTorchStructure(file)
    if (!pytorch.valid) return pytorch
  }

  if (option.dependencyLabel && !dependencyReference.trim()) {
    return { valid: false, message: `${option.dependencyLabel}가 필요합니다.` }
  }

  return { valid: true, message: `${option.label} 파일과 필수 실행 정보가 확인되었습니다.` }
}

/** Keep the file-upload implementation available until the feature is released. */
const fileUploadEnabled = false

const hubInstances = sampleInstances.map((instance) => {
  const instanceAnalysis = analyzeAas(instance.env)
  const hasDataset = instanceAnalysis.submodels.some((submodel) => submodel.autoKind === "dataset")
  const hasModel = instanceAnalysis.submodels.some((submodel) => submodel.autoKind === "model")

  return { instance, canImport: hasDataset && hasModel }
})

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Field({
  label,
  children,
  className,
  auto,
  required,
}: {
  label: string
  children: React.ReactNode
  className?: string
  auto?: boolean
  required?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
        </label>
        {auto && (
          <Badge
            variant="secondary"
            className="h-5 gap-1 px-1.5 text-[10px] font-normal text-chart-2"
          >
            <Sparkles className="size-3" />
            자동 추출
          </Badge>
        )}
      </div>
      {children}
    </div>
  )
}

function KeywordField({
  value,
  suggestions,
  onChange,
  onRegister,
}: {
  value: string
  suggestions: string[]
  onChange: (value: string) => void
  onRegister: (keyword: string) => void
}) {
  const [draft, setDraft] = useState("")
  const [open, setOpen] = useState(false)
  const keywords = value.split(",").map((keyword) => keyword.trim()).filter(Boolean)
  const available = suggestions.filter((keyword) => !keywords.includes(keyword))

  function addKeyword(rawKeyword: string) {
    const keyword = rawKeyword.trim().replace(/^#/, "")
    if (!keyword) return
    if (!keywords.includes(keyword)) onChange([...keywords, keyword].join(", "))
    onRegister(keyword)
    setDraft("")
  }

  function removeKeyword(keyword: string) {
    onChange(keywords.filter((item) => item !== keyword).join(", "))
  }

  return (
    <div className="relative">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        {keywords.map((keyword) => (
          <Badge key={keyword} variant="secondary" className="gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium">
            <Tag className="size-3.5" />
            {keyword}
            <button type="button" aria-label={`${keyword} 키워드 삭제`} onClick={() => removeKeyword(keyword)}>
              <X className="size-3.5 text-muted-foreground" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (["Enter", ",", " "].includes(event.key)) {
              event.preventDefault()
              addKeyword(draft)
            } else if (event.key === "Backspace" && !draft && keywords.length > 0) {
              removeKeyword(keywords[keywords.length - 1])
            }
          }}
          placeholder={keywords.length > 0 ? "키워드 추가" : "단어를 입력하거나 기존 키워드를 선택하세요"}
          className="h-7 min-w-48 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="키워드 추가"
        />
      </div>
      {open && available.length > 0 && (
        <div className="absolute left-0 top-[calc(100%+0.375rem)] z-20 flex w-full flex-wrap gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md">
          <p className="w-full text-xs font-medium text-muted-foreground">기존에 등록된 키워드</p>
          {available.map((keyword) => (
            <button
              key={keyword}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addKeyword(keyword)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs transition-colors hover:bg-primary/10 hover:text-primary"
            >
              #{keyword}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AssetFileField({
  accept,
  file,
  onChange,
}: {
  accept: string
  file: File | null
  onChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
      >
        <UploadCloud className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{file?.name || "파일을 선택해 주세요"}</span>
        <span className="shrink-0 text-sm text-muted-foreground">찾아보기</span>
      </button>
    </>
  )
}

/** Read-only display for values extracted from the AAS template. */
function LockedBox({ value }: { value: string }) {
  return (
    <div
      className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
      title={value || undefined}
    >
      <Lock className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate whitespace-nowrap">{value || "—"}</span>
    </div>
  )
}

function GroupTitle({
  step,
  title,
  description,
}: {
  step?: string
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      {step && (
        <span className="text-xs font-medium uppercase tracking-wide text-primary">{step}</span>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
    </div>
  )
}

function UploadZone({
  upload,
  onFile,
  onClear,
}: {
  upload: AasUpload
  onFile: (file: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    if (files && files.length > 0) onFile(files[0])
  }

  if (upload.status !== "empty") {
    const isError = upload.status === "error"
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          isError ? "border-destructive/40 bg-destructive/5" : "border-chart-2/40 bg-chart-2/5",
        )}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            isError ? "bg-destructive/15 text-destructive" : "bg-chart-2/15 text-chart-2",
          )}
        >
          {isError ? <AlertCircle className="size-5" /> : <FileJson className="size-5" />}
        </span>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-medium">{upload.fileName}</span>
          {isError ? (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="size-3.5" />
              JSON 파싱 실패
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-chart-2">
              <CheckCircle2 className="size-3.5" />
              {upload.source === "import" ? "ezAAS 허브에서 가져오기 완료" : "AAS 업로드 완료"}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label="파일 제거" onClick={onClear}>
          <X data-icon="inline-start" />
        </Button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.xml,application/json,application/xml,text/xml"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/5",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="size-6" />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            통합 AAS 파일을 끌어다 놓거나 클릭하여 업로드
          </span>
          <span className="text-xs text-muted-foreground">
            AI Dataset · AI ModelNameplate Submodel 포함 · JSON 형식
          </span>
        </span>
      </button>
    </>
  )
}

function ImportPanel({ onImport }: { onImport: (instance: SampleInstance) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Server className="size-3.5 text-primary" />
        ezAAS 허브에서 내 Instance를 선택해 가져옵니다.
      </div>
      {hubInstances.map(({ instance: inst, canImport }) => {
        return (
          <div
            key={inst.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Boxes className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{inst.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {inst.platform} · {inst.contains} · {inst.updatedAt}
              </span>
              {!canImport && (
                <span className="text-xs text-destructive">
                  AI Dataset과 AI ModelNameplate가 모두 필요합니다.
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!canImport}
              title={canImport ? undefined : "AI Dataset과 AI ModelNameplate가 모두 필요합니다."}
              onClick={() => onImport(inst)}
            >
              가져오기
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 whitespace-nowrap text-muted-foreground">{label}</span>
      <span
        className="min-w-0 truncate whitespace-nowrap text-right font-medium"
        title={value || undefined}
      >
        {value || "—"}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main workflow                                                       */
/* ------------------------------------------------------------------ */

export function RegisterWorkflow() {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(1)
  const [step2Asset, setStep2Asset] = useState<"dataset" | "model">("dataset")
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [mode, setMode] = useState<"file" | "import">("import")
  const [upload, setUpload] = useState<AasUpload>({ status: "empty" })
  const [analysis, setAnalysis] = useState<AasAnalysis | null>(null)
  const [assignments, setAssignments] = useState<Record<string, AssetKind>>({})
  const [datasetFile, setDatasetFile] = useState<File | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [knownKeywords, setKnownKeywords] = useState(defaultKeywordSuggestions)

  const [datasetInput, setDatasetInput] = useState<DatasetForm>({
    title: "",
    author: "",
    version: "v1.0",
    summary: "",
    detailType: "",
    task: "",
    license: "공개",
    keywords: "",
  })
  const [modelInput, setModelInput] = useState<ModelForm>({
    title: "",
    author: "",
    version: "v1.0",
    summary: "",
    framework: "",
    task: "",
    license: "공개",
    keywords: "",
    assetType: "weights",
    artifactReference: "",
    dependencyReference: "",
  })

  useEffect(() => {
    if (!registrationComplete) return

    const countdownTimer = window.setInterval(() => {
      setRedirectCountdown((current) => Math.max(0, current - 1))
    }, 1000)
    const redirectTimer = window.setTimeout(() => {
      router.replace("/")
    }, 5000)

    return () => {
      window.clearInterval(countdownTimer)
      window.clearTimeout(redirectTimer)
    }
  }, [registrationComplete, router])

  useEffect(() => {
    try {
      const storedKeywords = JSON.parse(localStorage.getItem("ai-asset-keywords") || "[]") as unknown
      if (Array.isArray(storedKeywords)) {
        setKnownKeywords((current) => Array.from(new Set([...current, ...storedKeywords.filter((item): item is string => typeof item === "string")])))
      }
    } catch {
      localStorage.removeItem("ai-asset-keywords")
    }
  }, [])

  function registerKeyword(keyword: string) {
    setKnownKeywords((current) => {
      const next = Array.from(new Set([...current, keyword]))
      localStorage.setItem("ai-asset-keywords", JSON.stringify(next))
      return next
    })
  }

  function goTo(step: number) {
    if (step === 2 && !isParsed) return
    if (step === 3 && (!datasetFormComplete || !modelFormComplete)) return
    setActiveStep(step)
    if (step === 2) setStep2Asset("dataset")
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  async function completeRegistration() {
    if (!modelArtifactReady || submitting) return
    setSubmitting(true)

    const inspection = await inspectModelArtifact(
      selectedModelAsset,
      modelFile,
      modelInput.artifactReference,
      modelInput.dependencyReference,
    )
    const framework = modelMeta.framework?.toLowerCase()
    const targetModel =
      models.find((model) => model.task === modelInput.task && (!framework || model.framework.toLowerCase() === framework)) ||
      models.find((model) => model.task === modelInput.task) ||
      models[0]

    if (targetModel) {
      startModelValidation({
        modelId: targetModel.id,
        pairIds: assetPairs.filter((pair) => pair.model.id === targetModel.id).map((pair) => pair.id),
        fileName: modelFile?.name || modelInput.artifactReference.trim(),
        outcome: inspection.valid ? "valid" : "invalid",
        message: inspection.message,
      })
    }

    setRedirectCountdown(5)
    setRegistrationComplete(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  /** Parse + analyze an AAS environment and seed the auto-classification. */
  function loadEnv(
    fileName: string,
    fileSize: number,
    env: AasEnvironment,
    source: "file" | "import",
  ) {
    const tree = parseAasTree(env)
    const result = analyzeAas(env)
    setUpload({ status: "parsed", fileName, fileSize, tree, env, source })
    setAnalysis(result)
    setDatasetFile(null)
    setModelFile(null)
    setModelInput((current) => ({
      ...current,
      assetType: "weights",
      artifactReference: "",
      dependencyReference: "",
    }))
    setStep2Asset("dataset")
    const init: Record<string, AssetKind> = {}
    for (const s of result.submodels) init[s.key] = s.autoKind
    setAssignments(init)
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text()
      const json = JSON.parse(text) as AasEnvironment
      loadEnv(file.name, file.size, json, "file")
    } catch {
      setUpload({
        status: "error",
        fileName: file.name,
        message:
          "AAS JSON 파일을 파싱할 수 없습니다. 올바른 JSON 형식인지 확인한 뒤 다시 업로드해 주세요.",
      })
      setAnalysis(null)
      setAssignments({})
    }
  }

  function handleImport(inst: SampleInstance) {
    const size = new Blob([JSON.stringify(inst.env)]).size
    loadEnv(`${inst.name}.json`, size, inst.env, "import")
  }

  function clearUpload() {
    setUpload({ status: "empty" })
    setAnalysis(null)
    setAssignments({})
  }

  /* Resolve the submodels currently assigned to each asset kind. */
  const datasetSm = useMemo(() => {
    if (!analysis) return undefined
    const hit = analysis.submodels.find((s) => assignments[s.key] === "dataset")
    return hit?.submodel
  }, [analysis, assignments])

  const modelSm = useMemo(() => {
    if (!analysis) return undefined
    const hit = analysis.submodels.find((s) => assignments[s.key] === "model")
    return hit?.submodel
  }, [analysis, assignments])

  const datasetMeta = useMemo(
    () => (datasetSm ? extractDatasetMeta(datasetSm) : {}),
    [datasetSm],
  )
  const modelMeta = useMemo(
    () => (modelSm ? extractModelMeta(modelSm) : {}),
    [modelSm],
  )

  const hasDataset = !!datasetSm
  const hasModel = !!modelSm

  /* AAS metadata is read-only; author comes from the signed-in capability account. */
  const capabilityAuthorEmail = "amrc@keti.re.kr"
  const dsVal = (f: keyof DatasetForm) => {
    if (f === "author") return capabilityAuthorEmail
    if (f === "version") return dsVersion
    return datasetInput[f]
  }
  const mdVal = (f: keyof ModelForm) => {
    if (f === "author") return capabilityAuthorEmail
    if (f === "version") return mdVersion
    if (f === "framework") return modelMeta.framework || "—"
    return modelInput[f]
  }
  const dsVersion = datasetMeta.version || "v1.0"
  const mdVersion = modelMeta.version || "v1.0"
  const datasetFileType = datasetMeta.fileType || ""
  const dataCategory = dataCategoryFromFileType(datasetFileType)
  const detailTypeOptions = Array.from(new Set([...(detailTypesByCategory[dataCategory] || detailTypesByCategory["기타 데이터"]), "기타"]))
  const selectedModelAsset =
    modelAssetOptions.find((option) => option.value === modelInput.assetType) ?? modelAssetOptions[0]
  const modelArtifactReady = selectedModelAsset.source === "file"
    ? Boolean(modelFile && (!selectedModelAsset.dependencyLabel || modelInput.dependencyReference.trim()))
    : Boolean(modelInput.artifactReference.trim())

  const datasetFormComplete = Boolean(
    datasetInput.title.trim() &&
      datasetInput.detailType &&
      datasetInput.task &&
      datasetInput.license &&
      datasetInput.summary.trim() &&
      datasetInput.keywords.trim() &&
      datasetFile,
  )
  const modelFormComplete = Boolean(
    modelInput.title.trim() &&
      modelInput.task &&
      modelInput.license &&
      modelInput.summary.trim() &&
      modelInput.keywords.trim() &&
      modelArtifactReady,
  )

  const isParsed = upload.status === "parsed"

  if (registrationComplete) {
    return (
      <Card
        className="flex min-h-96 flex-col items-center justify-center gap-6 p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LoaderCircle className="size-9 animate-spin" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">등록 완료 · 추론 가능 여부 확인 중</h2>
          <p className="text-sm text-muted-foreground">등록한 {selectedModelAsset.label}의 구조와 정상적인 추론 가능 여부를 검증하고 있습니다.</p>
          <p className="text-sm text-muted-foreground">
            {redirectCountdown}초 후 홈으로 이동합니다.
          </p>
        </div>
        <Button onClick={() => router.replace("/")}>
          지금 홈으로 이동
          <ArrowRight data-icon="inline-end" />
        </Button>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Step indicator */}
      <div className="sticky top-16 z-10 -mx-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          {steps.map((s, i) => {
            const active = activeStep === s.id
            const done = activeStep > s.id
            const locked = (s.id === 2 && !isParsed) || (s.id === 3 && (!datasetFormComplete || !modelFormComplete))
            const Icon = s.icon
            return (
              <div key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => goTo(s.id)}
                  disabled={locked}
                  className="flex min-w-0 items-center gap-2.5 text-left disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                      active && "border-primary bg-primary text-primary-foreground",
                      done && "border-chart-2 bg-chart-2 text-primary-foreground",
                      !active && !done && "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Step {s.id}
                    </span>
                    <span
                      className={cn(
                        "truncate whitespace-nowrap text-sm font-medium",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <span className="mx-1 hidden h-px flex-1 bg-border sm:block" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 1 – AAS import (file upload is temporarily hidden) */}
      {activeStep === 1 && (
        <Card className="p-6 md:p-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Boxes className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <h2 className="text-lg font-semibold">ezAAS 허브에서 모델 가져오기</h2>
                <p className="text-sm text-muted-foreground xl:whitespace-nowrap">
                  통합 AAS에서 AI Dataset과 AI ModelNameplate를 분류하고 메타데이터를 자동
                  추출합니다.
                </p>
              </div>
            </div>

            {/* File upload stays implemented but hidden until it is ready for release. */}
            {fileUploadEnabled && (
              <div className="inline-flex w-full max-w-xl gap-1 rounded-xl border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setMode("file")}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    mode === "file"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <UploadCloud className="size-4" />
                  파일 업로드
                </button>
                <button
                  type="button"
                  onClick={() => setMode("import")}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    mode === "import"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Server className="size-4" />
                  ezAAS 허브에서 모델 가져오기
                </button>
              </div>
            )}

            {mode === "file" ? (
              <UploadZone upload={upload} onFile={handleFile} onClear={clearUpload} />
            ) : isParsed ? (
              <UploadZone upload={upload} onFile={handleFile} onClear={clearUpload} />
            ) : (
              <ImportPanel onImport={handleImport} />
            )}

            {upload.status === "error" && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>AAS JSON을 읽을 수 없습니다</AlertTitle>
                <AlertDescription>{upload.message}</AlertDescription>
              </Alert>
            )}

            {isParsed && analysis && (
              <>
                {/* Auto-detection summary */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4",
                      hasDataset
                        ? "border-chart-3/40 bg-chart-3/5"
                        : "border-border bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg",
                        hasDataset
                          ? "bg-chart-3/15 text-chart-3"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Database className="size-4" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">AI Dataset</span>
                      <span className="text-xs text-muted-foreground">
                        {hasDataset ? "Submodel 자동 감지됨" : "감지되지 않음"}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4",
                      hasModel ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg",
                        hasModel ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Cpu className="size-4" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">AI ModelNameplate</span>
                      <span className="text-xs text-muted-foreground">
                        {hasModel ? "Submodel 자동 감지됨" : "감지되지 않음"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <AasViewer
                    fileName={upload.fileName}
                    fileSize={upload.fileSize}
                    tree={upload.tree}
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button onClick={() => goTo(2)} disabled={!isParsed}>
                다음
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2 – Extraction review & input */}
      {activeStep === 2 && (
        <Card className="p-6 md:p-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </span>
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold">메타데이터 확인 및 입력</h2>
                <p className="text-sm text-muted-foreground">
                  AAS에서 가져온 정보는 확인하고, 등록에 필요한 정보는 직접 입력해 주세요.
                </p>
              </div>
            </div>

            {!analysis ? (
              <Alert>
                <AlertCircle />
                <AlertTitle>업로드된 AAS가 없습니다</AlertTitle>
                <AlertDescription>
                  이전 단계에서 ezAAS 허브의 모델을 가져와 주세요.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {!hasDataset && !hasModel && (
                  <Alert>
                    <AlertCircle />
                    <AlertTitle>분류된 자산이 없습니다</AlertTitle>
                    <AlertDescription>
                      불러온 AAS에서 AI Dataset 또는 AI ModelNameplate Submodel을 찾지 못했습니다.
                    </AlertDescription>
                  </Alert>
                )}

                {hasDataset && hasModel && (
                  <div className="rounded-2xl border border-border bg-muted/20 p-3 md:p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="text-sm font-semibold">STEP 2 입력 순서</p>
                        <p className="text-xs text-muted-foreground">자산 카드를 눌러 작성 화면을 전환할 수 있습니다.</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">Dataset → Model</Badge>
                    </div>
                    <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)]">
                      <button
                        type="button"
                        onClick={() => setStep2Asset("dataset")}
                        aria-pressed={step2Asset === "dataset"}
                        className={cn(
                          "flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                          step2Asset === "dataset"
                            ? "border-chart-3/60 bg-chart-3/10 ring-2 ring-chart-3/15"
                            : "border-border bg-card hover:border-chart-3/40 hover:bg-chart-3/5",
                        )}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-chart-3/15 text-chart-3"><Database className="size-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">Dataset 정보</span>
                          <span className={cn("block text-xs", datasetFormComplete ? "text-chart-3" : "text-muted-foreground")}>{datasetFormComplete ? "필수 정보 입력 완료" : "먼저 입력해 주세요"}</span>
                        </span>
                        {datasetFormComplete && <CheckCircle2 className="size-4 shrink-0 text-chart-3" />}
                      </button>

                      <div className="flex items-center text-primary" aria-label="Dataset이 Model 학습에 사용됨">
                        <span className="h-px min-w-3 flex-1 bg-primary/30" />
                        <span className="mx-2 inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap">
                          <Link2 className="size-3.5" />
                          학습에 사용됨
                        </span>
                        <span className="relative h-px min-w-3 flex-1 bg-primary/30">
                          <span className="absolute -right-px -top-[3px] size-1.5 rotate-45 border-r border-t border-primary/50" />
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStep2Asset("model")}
                        disabled={!datasetFormComplete}
                        aria-pressed={step2Asset === "model"}
                        className={cn(
                          "flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                          step2Asset === "model"
                            ? "border-primary/60 bg-primary/10 ring-2 ring-primary/15"
                            : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                        )}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Cpu className="size-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">Model 정보</span>
                          <span className={cn("block text-xs", modelFormComplete ? "text-primary" : "text-muted-foreground")}>{modelFormComplete ? "필수 정보 입력 완료" : datasetFormComplete ? "입력할 수 있어요" : "Dataset 완료 후 입력"}</span>
                        </span>
                        {modelFormComplete && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                      </button>
                    </div>
                  </div>
                )}

                {step2Asset === "dataset" && hasDataset && (
                  <div className="flex flex-col gap-8">
                    <section className="flex flex-col gap-4">
                      <GroupTitle title="AAS에서 가져온 정보" />
                      <div className="grid gap-4 rounded-2xl bg-muted/30 p-4 md:grid-cols-2">
                        <Field label="작성자"><LockedBox value={capabilityAuthorEmail} /></Field>
                        <Field label="버전"><LockedBox value={dsVersion} /></Field>
                      </div>
                    </section>

                    <section className="flex flex-col gap-6 rounded-2xl border border-primary/25 bg-card p-5 shadow-sm ring-1 ring-primary/5 md:p-6">
                      <GroupTitle title="직접 작성하는 정보" />
                      <div className="flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2.5 text-sm text-primary">
                        <Sparkles className="mt-0.5 size-4 shrink-0" />
                        <p><span className="font-semibold">아래는 직접 입력하는 항목입니다.</span> 빨간 별표가 있는 필드를 모두 작성해야 Model 정보로 이동할 수 있습니다.</p>
                      </div>
                      <Field label="제목" required>
                        <Input
                          value={datasetInput.title}
                          onChange={(event) => setDatasetInput({ ...datasetInput, title: event.target.value })}
                          placeholder="데이터셋 제목을 입력해 주세요"
                          className="h-11 px-4"
                        />
                      </Field>
                      <div className="grid gap-5 md:grid-cols-2">
                        <Field label="데이터 카테고리" auto>
                          <LockedBox value={dataCategory} />
                          <p className="text-xs text-muted-foreground">AAS Metadata.Filetype: {datasetFileType || "—"}</p>
                        </Field>
                        <Field label="세부 유형" required>
                          <Select value={datasetInput.detailType} onValueChange={(value) => setDatasetInput({ ...datasetInput, detailType: value as string })}>
                            <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue placeholder="세부 유형 선택" /></SelectTrigger>
                            <SelectContent>{detailTypeOptions.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">카테고리에 맞는 데이터의 구체적인 성격을 선택해 주세요.</p>
                        </Field>
                        <Field label="적용 Task" required>
                          <Select value={datasetInput.task} onValueChange={(value) => setDatasetInput({ ...datasetInput, task: value as string })}>
                            <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue placeholder="Task 선택" /></SelectTrigger>
                            <SelectContent>{taskTypes.map((task) => <SelectItem key={task} value={task}>{task}</SelectItem>)}</SelectContent>
                          </Select>
                        </Field>
                        <Field label="공개 범위" required>
                          <Select value={datasetInput.license} onValueChange={(value) => setDatasetInput({ ...datasetInput, license: value as string })}>
                            <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>{visibilityOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <Field label="개요" required>
                        <Textarea value={datasetInput.summary} onChange={(event) => setDatasetInput({ ...datasetInput, summary: event.target.value })} placeholder="데이터셋의 내용과 활용 목적을 설명해 주세요" className="min-h-28" />
                      </Field>
                      <Field label="키워드" required>
                        <KeywordField value={datasetInput.keywords} suggestions={knownKeywords} onChange={(keywords) => setDatasetInput({ ...datasetInput, keywords })} onRegister={registerKeyword} />
                        <p className="text-xs text-muted-foreground">단어를 입력하거나 기존 키워드를 선택해 주세요.</p>
                      </Field>
                      <Field label="데이터셋 파일" required>
                        <AssetFileField accept={datasetAssetAccept} file={datasetFile} onChange={setDatasetFile} />
                        <p className="text-xs text-muted-foreground">
                          압축 패키지 또는 CSV, Parquet, JSON, 이미지, 오디오, 영상, NumPy 등 실제 데이터 파일을 업로드해 주세요.
                        </p>
                      </Field>
                    </section>

                    <div className="flex items-center justify-between border-t border-border pt-6">
                      <Button variant="outline" onClick={() => goTo(1)}><ArrowLeft data-icon="inline-start" />이전 단계</Button>
                      <Button onClick={() => { setStep2Asset("model"); window.scrollTo({ top: 0, behavior: "smooth" }) }} disabled={!datasetFormComplete}>
                        다음: Model 정보<ArrowRight data-icon="inline-end" />
                      </Button>
                    </div>
                  </div>
                )}

                {step2Asset === "model" && hasModel && (
                  <div className="flex flex-col gap-8">
                    <section className="flex flex-col gap-4">
                      <GroupTitle title="AAS에서 가져온 정보" />
                      <div className="grid gap-4 rounded-2xl bg-muted/30 p-4 md:grid-cols-3">
                        <Field label="작성자"><LockedBox value={capabilityAuthorEmail} /></Field>
                        <Field label="버전"><LockedBox value={mdVersion} /></Field>
                        <Field label="Framework"><LockedBox value={modelMeta.framework || "—"} /></Field>
                      </div>
                    </section>

                    <section className="flex flex-col gap-6 rounded-2xl border border-primary/25 bg-card p-5 shadow-sm ring-1 ring-primary/5 md:p-6">
                      <GroupTitle title="직접 작성하는 정보" />
                      <div className="flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2.5 text-sm text-primary">
                        <Sparkles className="mt-0.5 size-4 shrink-0" />
                        <p><span className="font-semibold">아래는 직접 입력하는 항목입니다.</span> 빨간 별표가 있는 필드를 모두 작성해야 작성 내용을 검토할 수 있습니다.</p>
                      </div>
                      <Field label="제목" required>
                        <Input value={modelInput.title} onChange={(event) => setModelInput({ ...modelInput, title: event.target.value })} placeholder="모델 제목을 입력해 주세요" className="h-11 px-4" />
                      </Field>
                      <Field label="모델 자산 유형" required>
                        <Select
                          value={modelInput.assetType}
                          onValueChange={(value) => {
                            setModelFile(null)
                            setModelInput({
                              ...modelInput,
                              assetType: value as ModelAssetType,
                              artifactReference: "",
                              dependencyReference: "",
                            })
                          }}
                        >
                          <SelectTrigger className="h-11 w-full rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {modelAssetOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label} · {option.examples}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{selectedModelAsset.examples}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selectedModelAsset.description}</p>
                        </div>
                      </Field>
                      <div className="grid gap-5 md:grid-cols-2">
                        <Field label="적용 Task" required>
                          <Select value={modelInput.task} onValueChange={(value) => setModelInput({ ...modelInput, task: value as string })}>
                            <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue placeholder="Task 선택" /></SelectTrigger>
                            <SelectContent>{taskTypes.map((task) => <SelectItem key={task} value={task}>{task}</SelectItem>)}</SelectContent>
                          </Select>
                        </Field>
                        <Field label="공개 범위" required>
                          <Select value={modelInput.license} onValueChange={(value) => setModelInput({ ...modelInput, license: value as string })}>
                            <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>{visibilityOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <Field label="개요" required>
                        <Textarea value={modelInput.summary} onChange={(event) => setModelInput({ ...modelInput, summary: event.target.value })} placeholder="모델의 목적과 활용 방식을 설명해 주세요" className="min-h-28" />
                      </Field>
                      <Field label="키워드" required>
                        <KeywordField value={modelInput.keywords} suggestions={knownKeywords} onChange={(keywords) => setModelInput({ ...modelInput, keywords })} onRegister={registerKeyword} />
                        <p className="text-xs text-muted-foreground">입력하거나 기존 키워드를 눌러 모델에 추가하세요.</p>
                      </Field>
                      {selectedModelAsset.source === "file" ? (
                        <Field label={`${selectedModelAsset.label} 파일`} required>
                          <AssetFileField
                            key={selectedModelAsset.value}
                            accept={selectedModelAsset.accept || ""}
                            file={modelFile}
                            onChange={setModelFile}
                          />
                          <p className="text-xs text-muted-foreground">
                            지원 형식: {selectedModelAsset.accept?.split(",").join(", ")}
                          </p>
                        </Field>
                      ) : (
                        <Field label={selectedModelAsset.referenceLabel || "모델 참조"} required>
                          <Input
                            value={modelInput.artifactReference}
                            onChange={(event) => setModelInput({ ...modelInput, artifactReference: event.target.value })}
                            placeholder={selectedModelAsset.referencePlaceholder}
                            className="h-11 px-4 font-mono text-sm"
                          />
                        </Field>
                      )}
                      {selectedModelAsset.dependencyLabel && (
                        <Field label={selectedModelAsset.dependencyLabel} required>
                          <Input
                            value={modelInput.dependencyReference}
                            onChange={(event) => setModelInput({ ...modelInput, dependencyReference: event.target.value })}
                            placeholder={selectedModelAsset.dependencyPlaceholder}
                            className="h-11 px-4"
                          />
                        </Field>
                      )}
                    </section>

                    <div className="flex items-center justify-between border-t border-border pt-6">
                      <Button variant="outline" onClick={() => { setStep2Asset("dataset"); window.scrollTo({ top: 0, behavior: "smooth" }) }}><ArrowLeft data-icon="inline-start" />Dataset 정보</Button>
                      <Button onClick={() => goTo(3)} disabled={!datasetFormComplete || !modelFormComplete}>작성 내용 검토<ArrowRight data-icon="inline-end" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Step 3 – Review */}
      {activeStep === 3 && (
        <Card className="p-6 md:p-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Check className="size-5" />
              </span>
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold">등록 내용 확인</h2>
                <p className="text-sm text-muted-foreground">
                  자동 추출 및 입력한 내용을 확인한 뒤 등록하세요.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "grid items-stretch gap-5",
                hasDataset && hasModel ? "lg:grid-cols-[1fr_auto_1fr]" : "max-w-xl",
              )}
            >
              {hasDataset && (
                <div className="flex flex-col gap-4 rounded-2xl border border-chart-3/30 bg-chart-3/5 p-6">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-chart-3/15 text-chart-3">
                      <Database className="size-4" />
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wide text-chart-3">
                      AI Dataset
                    </span>
                  </div>
                  <div className="flex flex-col divide-y divide-border/60">
                    <SummaryRow label="제목" value={dsVal("title")} />
                    <SummaryRow label="작성자" value={dsVal("author")} />
                    <SummaryRow label="버전" value={dsVersion} />
                    <SummaryRow label="데이터 카테고리" value={dataCategory} />
                    <SummaryRow label="세부 유형" value={dsVal("detailType")} />
                    <SummaryRow label="적용 Task" value={dsVal("task")} />
                    <SummaryRow label="공개 범위" value={dsVal("license")} />
                    <SummaryRow label="데이터 파일" value={datasetFile?.name || "—"} />
                  </div>
                </div>
              )}

              {hasDataset && hasModel && (
                <div className="flex flex-row items-center justify-center gap-3 lg:flex-col">
                  <span className="hidden text-xs font-medium text-muted-foreground lg:block">
                    <Database className="size-4 text-chart-3" />
                  </span>
                  <ArrowDown className="hidden size-4 text-muted-foreground lg:block" />
                  <Badge variant="secondary" className="gap-1.5 whitespace-nowrap">
                    <Link2 className="size-3.5 text-primary" />
                    학습에 사용됨
                  </Badge>
                  <ArrowDown className="hidden size-4 text-muted-foreground lg:block" />
                  <span className="hidden text-xs font-medium text-muted-foreground lg:block">
                    <Cpu className="size-4 text-primary" />
                  </span>
                </div>
              )}

              {hasModel && (
                <div className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-6">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Cpu className="size-4" />
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wide text-primary">
                      AI ModelNameplate
                    </span>
                  </div>
                  <div className="flex flex-col divide-y divide-border/60">
                    <SummaryRow label="제목" value={mdVal("title")} />
                    <SummaryRow label="작성자" value={mdVal("author")} />
                    <SummaryRow label="버전" value={mdVersion} />
                    <SummaryRow label="Framework" value={mdVal("framework")} />
                    <SummaryRow label="Task" value={mdVal("task")} />
                    <SummaryRow label="공개 범위" value={mdVal("license")} />
                    <SummaryRow label="모델 자산 유형" value={selectedModelAsset.label} />
                    <SummaryRow
                      label={selectedModelAsset.source === "file" ? "모델 파일" : "모델 참조"}
                      value={modelFile?.name || modelInput.artifactReference || "—"}
                    />
                    {selectedModelAsset.dependencyLabel && (
                      <SummaryRow label={selectedModelAsset.dependencyLabel} value={modelInput.dependencyReference} />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="outline" onClick={() => goTo(2)}>
                <ArrowLeft data-icon="inline-start" />
                이전
              </Button>
              <Button size="lg" onClick={completeRegistration} disabled={submitting}>
                {submitting ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
                {submitting ? "모델 자산 확인 중" : "등록 완료"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

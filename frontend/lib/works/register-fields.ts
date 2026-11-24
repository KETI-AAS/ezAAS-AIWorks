/**
 * Registration field definitions. Option lists, accept lists and required
 * rules mirror `components/register/register-workflow.tsx` (the original
 * registration flow), so both screens stay on the same contract.
 */
import { taskTypes } from "@/lib/registry-data"

export const TASK_TYPES = taskTypes as readonly string[]

/** Registration exposes only two visibility levels. */
export const VISIBILITY_OPTIONS = ["공개", "비공개"] as const
export type Visibility = (typeof VISIBILITY_OPTIONS)[number]

export const KEYWORD_SUGGESTIONS = ["제조", "불량", "예측", "센서", "검사", "공정"]

export type ModelAssetType = "weights" | "checkpoint" | "adapter" | "graph" | "runtime" | "package" | "container" | "external"

export type ModelAssetOption = {
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

export const MODEL_ASSET_OPTIONS: ModelAssetOption[] = [
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
    description: "연산 그래프와 가중치, 입출력 구조를 포함합니다. SavedModel은 ZIP으로 올려 주세요.",
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

export const assetOption = (t: ModelAssetType) => MODEL_ASSET_OPTIONS.find((o) => o.value === t) ?? MODEL_ASSET_OPTIONS[0]

export const DATASET_ACCEPT = [
  ".zip", ".tar", ".gz", ".tgz",
  ".csv", ".tsv", ".parquet", ".xlsx", ".xls",
  ".json", ".jsonl", ".txt", ".xml", ".yaml", ".yml",
  ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff",
  ".wav", ".flac", ".mp3", ".ogg",
  ".mp4", ".avi", ".mov", ".mkv", ".webm",
  ".npy", ".npz",
].join(",")

export const DETAIL_TYPES_BY_CATEGORY: Record<string, string[]> = {
  "이미지 데이터": ["검사 이미지", "제품 이미지", "결함 이미지", "열화상 이미지"],
  "표형 데이터": ["공정 데이터", "센서 데이터", "진동 데이터", "시계열 데이터", "품질 데이터"],
  "오디오 데이터": ["음성 데이터", "설비 소음 데이터", "환경음 데이터"],
  "영상 데이터": ["검사 영상", "공정 영상", "CCTV 영상"],
  "텍스트 데이터": ["문서 데이터", "로그 데이터", "자연어 데이터"],
  "구조화 데이터": ["메타데이터", "이벤트 데이터", "트랜잭션 데이터"],
  "기타 데이터": ["센서 데이터", "공정 데이터", "복합 데이터"],
}

/** Same mapping as the original flow: derived from AAS `Metadata.Filetype`. */
export function dataCategoryFromFileType(fileType: string) {
  const n = fileType.trim().toLowerCase().split(/[./\\]/).filter(Boolean).pop() || ""
  if (["png", "jpg", "jpeg", "bmp", "gif", "tif", "tiff", "webp"].includes(n)) return "이미지 데이터"
  if (["csv", "tsv", "xls", "xlsx", "parquet"].includes(n)) return "표형 데이터"
  if (["wav", "mp3", "flac", "aac", "ogg"].includes(n)) return "오디오 데이터"
  if (["mp4", "avi", "mov", "mkv", "webm"].includes(n)) return "영상 데이터"
  if (["txt", "md", "pdf", "doc", "docx", "json", "jsonl", "xml", "yaml", "yml"].includes(n)) return "텍스트 데이터"
  return "기타 데이터"
}

export function fileExtension(name: string) {
  const dot = name.lastIndexOf(".")
  return dot >= 0 ? name.slice(dot).toLowerCase() : ""
}

export function accepts(accept: string, name: string) {
  return accept.split(",").map((a) => a.trim().toLowerCase()).includes(fileExtension(name))
}

export type DatasetForm = {
  title: string
  detailType: string
  task: string
  visibility: Visibility
  summary: string
  keywords: string[]
}

export type ModelForm = {
  title: string
  assetType: ModelAssetType
  task: string
  visibility: Visibility
  summary: string
  keywords: string[]
  artifactReference: string
  dependencyReference: string
}

export const emptyDataset = (): DatasetForm => ({ title: "", detailType: "", task: "", visibility: "공개", summary: "", keywords: [] })
export const emptyModel = (): ModelForm => ({
  title: "",
  assetType: "weights",
  task: "",
  visibility: "공개",
  summary: "",
  keywords: [],
  artifactReference: "",
  dependencyReference: "",
})

export type AttachedFile = { name: string; size: number }
export type FieldErrors = Record<string, string>

const TITLE_MAX = 100

export function validateDataset(f: DatasetForm, file: AttachedFile | undefined): FieldErrors {
  const e: FieldErrors = {}
  if (!f.title.trim()) e.title = "제목을 입력해 주세요."
  else if (f.title.trim().length > TITLE_MAX) e.title = `제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`
  if (!f.detailType) e.detailType = "세부 유형을 선택해 주세요."
  if (!f.task) e.task = "적용 Task를 선택해 주세요."
  if (!f.summary.trim()) e.summary = "개요를 입력해 주세요."
  if (f.keywords.length === 0) e.keywords = "키워드를 1개 이상 추가해 주세요."
  if (!file) e.file = "데이터셋 파일을 올려 주세요."
  return e
}

/** Reference checks reuse the patterns from the original `inspectModelArtifact`. */
function referenceValid(type: ModelAssetType, ref: string) {
  return type === "external"
    ? /^(https?:\/\/|registry:\/\/|hf:\/\/|s3:\/\/)/i.test(ref)
    : /^(?:[a-z0-9.-]+(?::[0-9]+)?\/)?[a-z0-9._/-]+(?::[a-z0-9._-]+|@sha256:[a-f0-9]+)$/i.test(ref)
}

export function validateModel(f: ModelForm, file: AttachedFile | undefined): FieldErrors {
  const opt = assetOption(f.assetType)
  const e: FieldErrors = {}
  if (!f.title.trim()) e.title = "제목을 입력해 주세요."
  else if (f.title.trim().length > TITLE_MAX) e.title = `제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`
  if (!f.task) e.task = "적용 Task를 선택해 주세요."
  if (!f.summary.trim()) e.summary = "개요를 입력해 주세요."
  if (f.keywords.length === 0) e.keywords = "키워드를 1개 이상 추가해 주세요."
  if (opt.source === "file") {
    if (!file) e.file = `${opt.label} 파일을 올려 주세요.`
  } else {
    const ref = f.artifactReference.trim()
    if (!ref) e.artifactReference = `${opt.referenceLabel}를 입력해 주세요.`
    else if (!referenceValid(f.assetType, ref)) e.artifactReference = `${opt.referenceLabel} 형식이 아니에요. ${opt.referencePlaceholder}`
  }
  if (opt.dependencyLabel && !f.dependencyReference.trim()) e.dependencyReference = `${opt.dependencyLabel} 항목을 입력해 주세요.`
  return e
}

/** Ordered required fields per group, used for readiness counts and focus order. */
export function requiredFields(group: "model" | "dataset", model: ModelForm) {
  if (group === "dataset")
    return [
      { key: "title", label: "제목" },
      { key: "detailType", label: "세부 유형" },
      { key: "task", label: "적용 Task" },
      { key: "summary", label: "개요" },
      { key: "keywords", label: "키워드" },
      { key: "file", label: "데이터셋 파일" },
    ]
  const opt = assetOption(model.assetType)
  return [
    { key: "title", label: "제목" },
    { key: "task", label: "적용 Task" },
    { key: "summary", label: "개요" },
    { key: "keywords", label: "키워드" },
    opt.source === "file" ? { key: "file", label: `${opt.label} 파일` } : { key: "artifactReference", label: opt.referenceLabel ?? "모델 참조" },
    ...(opt.dependencyLabel ? [{ key: "dependencyReference", label: opt.dependencyLabel }] : []),
  ]
}

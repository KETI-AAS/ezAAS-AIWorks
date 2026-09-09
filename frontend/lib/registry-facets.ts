// Derived facet metadata for the Dataset / Model registry explorers.
// The base mock data (registry-data.ts) does not carry every marketplace
// dimension (access level, file formats, deployment targets, etc.), so we
// derive them here from real fields where possible and fall back to a stable
// hash of the item id so distributions look natural and filtering stays
// consistent across renders.

import { getDataset, type Dataset, type Model } from "./registry-data"

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

/* ------------------------------------------------------------------ */
/* Shared mappings                                                     */
/* ------------------------------------------------------------------ */

/** Registry data type -> Korean filter labels. */
function dataTypeLabels(dataType: string): string[] {
  switch (dataType) {
    case "이미지":
      return ["이미지"]
    case "시계열":
      return ["시계열", "센서 데이터"]
    case "정형 데이터":
      return ["표형 데이터"]
    case "텍스트":
      return ["텍스트"]
    case "오디오":
      return ["오디오"]
    case "비디오":
      return ["영상"]
    case "멀티모달":
      return ["이미지", "텍스트"]
    default:
      return ["기타"]
  }
}

function taskLabel(task: string): string {
  const labels: Record<string, string> = {
    "Object Detection": "객체 탐지",
    OCR: "OCR",
    Segmentation: "영역 분할",
    Classification: "분류",
    "Anomaly Detection": "이상 탐지",
    Forecasting: "예측",
  }
  return labels[task] ?? task
}

function accessLevel(license: string): string {
  const restricted = /NC|Internal|Proprietary|Restricted/i.test(license)
  if (!restricted) return "공개"
  return "비공개"
}

/* ------------------------------------------------------------------ */
/* Dataset facets                                                      */
/* ------------------------------------------------------------------ */

export const datasetFilterGroups = [
  {
    id: "task",
    label: "적용 작업",
    options: [
      "객체 탐지",
      "OCR",
      "영역 분할",
      "분류",
      "이상 탐지",
      "예측",
    ],
  },
  {
    id: "dataType",
    label: "데이터 유형",
    options: ["이미지", "센서 데이터", "표형 데이터", "시계열", "텍스트", "로그"],
  },
  {
    id: "domain",
    label: "활용 분야",
    options: [
      "자동차 검사",
      "문서 처리",
      "설비 모니터링",
      "PCB 검사",
      "제조",
    ],
  },
  {
    id: "fileFormat",
    label: "파일 형식",
    options: ["JPG", "PNG", "CSV", "JSON", "Parquet", "TXT"],
  },
  {
    id: "access",
    label: "공개 범위",
    options: ["공개", "비공개"],
  },
] as const

function datasetDomain(d: Dataset): string {
  if (d.task === "OCR") return "문서 처리"
  switch (d.industry) {
    case "자동차":
      return "자동차 검사"
    case "전자·반도체":
      return "PCB 검사"
    case "기계·장비":
    case "에너지":
      return "설비 모니터링"
    default:
      return "제조"
  }
}

function datasetFileFormats(d: Dataset): string[] {
  const formats: string[] = []
  const dataTypes = dataTypeLabels(d.dataType)
  if (dataTypes.includes("이미지")) formats.push("JPG", "PNG")
  if (dataTypes.includes("표형 데이터")) formats.push("CSV", "Parquet")
  if (dataTypes.includes("시계열") || dataTypes.includes("센서 데이터")) formats.push("CSV", "Parquet")
  if (dataTypes.includes("텍스트")) formats.push("TXT", "JSON")

  // Storage hints
  const ft = d.storage?.fileType?.toUpperCase()
  if (ft && ["JPG", "PNG", "CSV", "JSON", "PARQUET", "TXT"].includes(ft)) {
    formats.push(ft === "PARQUET" ? "Parquet" : ft)
  }
  const af = `${d.storage?.annotationFile ?? ""} ${d.storage?.annotationFormat ?? ""}`.toLowerCase()
  if (/json|coco/.test(af)) formats.push("JSON")
  if (/log|로그|이력/.test(`${d.name} ${d.tags.join(" ")}`)) formats.push("TXT")

  return uniq(formats)
}

function datasetDataTypeValues(d: Dataset): string[] {
  const values = dataTypeLabels(d.dataType)
  if (/log|로그|이력/.test(`${d.name} ${d.tags.join(" ")}`)) values.push("로그")
  return uniq(values)
}

function datasetTaskValues(d: Dataset): string[] {
  const values = [taskLabel(d.task)]
  if (d.dataType === "시계열") values.push("예측")
  return uniq(values)
}

/** Facet values for a dataset, keyed by filter group id. */
export function datasetFacetValues(d: Dataset): Record<string, string[]> {
  return {
    task: datasetTaskValues(d),
    dataType: datasetDataTypeValues(d),
    domain: [datasetDomain(d)],
    fileFormat: datasetFileFormats(d),
    access: [accessLevel(d.license)],
  }
}

export function datasetSampleCount(d: Dataset): number {
  return Number(d.totalSamples.replace(/[^0-9]/g, "")) || 0
}

/* ------------------------------------------------------------------ */
/* Model facets                                                        */
/* ------------------------------------------------------------------ */

export const modelFilterGroups = [
  {
    id: "task",
    label: "적용 작업",
    options: [
      "객체 탐지",
      "OCR",
      "분류",
      "이상 탐지",
      "영역 분할",
      "예측",
    ],
  },
  {
    id: "inputType",
    label: "입력 데이터 유형",
    options: ["이미지 데이터", "표형 데이터", "텍스트 데이터", "오디오 데이터", "영상 데이터", "기타 데이터"],
  },
  {
    id: "framework",
    label: "프레임워크",
    options: ["PyTorch", "TensorFlow", "ONNX", "scikit-learn", "Transformers"],
  },
  {
    id: "access",
    label: "공개 범위",
    options: ["공개", "비공개"],
  },
  {
    id: "inference",
    label: "추론 가능 여부",
    options: ["추론 가능", "추론 불가능"],
  },
] as const

function modelArchitectureValues(m: Model): string[] {
  const a = m.architecture
  const values: string[] = []
  if (/yolo/i.test(a)) values.push("YOLO")
  if (/lstm|rnn|gru/i.test(a)) values.push("LSTM")
  if (/transformer|bert|vit|segformer|gpt/i.test(a)) values.push("Transformer")
  if (/forest/i.test(a)) values.push("Random Forest")
  if (/xgb|boost/i.test(a)) values.push("XGBoost")
  if (/cnn|resnet|efficientnet|efficient|conv/i.test(a)) values.push("CNN")
  if (values.length === 0) values.push("CNN")
  return uniq(values)
}

function modelFrameworkValues(m: Model): string[] {
  const values: string[] = []
  const arch = modelArchitectureValues(m)
  if (arch.includes("Random Forest") || arch.includes("XGBoost")) {
    values.push("scikit-learn")
  }
  if (arch.includes("Transformer")) values.push("Transformers")
  switch (m.framework) {
    case "TensorRT":
      values.push("ONNX")
      break
    default:
      values.push(m.framework)
  }
  return uniq(values)
}

function modelAccessLevel(m: Model): string {
  const ds = getDataset(m.datasetId)
  return accessLevel(ds?.license ?? "Public")
}

function dataCategoryFromFileType(fileType: string): string {
  const extension = fileType.trim().toLowerCase().split(/[./\\]/).filter(Boolean).pop() ?? ""
  if (["png", "jpg", "jpeg", "bmp", "gif", "tif", "tiff", "webp"].includes(extension)) return "이미지 데이터"
  if (["csv", "tsv", "xls", "xlsx", "parquet"].includes(extension)) return "표형 데이터"
  if (["txt", "md", "pdf", "doc", "docx", "json", "jsonl", "xml", "yaml", "yml"].includes(extension)) return "텍스트 데이터"
  if (["wav", "mp3", "flac", "aac", "ogg"].includes(extension)) return "오디오 데이터"
  if (["mp4", "avi", "mov", "mkv", "webm"].includes(extension)) return "영상 데이터"
  return "기타 데이터"
}

function modelInputTypeValues(m: Model): string[] {
  const dataset = getDataset(m.datasetId)
  if (dataset?.storage.fileType) return [dataCategoryFromFileType(dataset.storage.fileType)]

  const fallback: Record<string, string> = {
    이미지: "이미지 데이터",
    "정형 데이터": "표형 데이터",
    텍스트: "텍스트 데이터",
    오디오: "오디오 데이터",
    비디오: "영상 데이터",
  }
  return [fallback[m.dataType] ?? "기타 데이터"]
}

/** Facet values for a model, keyed by filter group id. */
export function modelFacetValues(
  m: Model,
  validationStatus: "validating" | "valid" | "invalid" = "valid",
): Record<string, string[]> {
  return {
    task: [taskLabel(m.task)],
    inputType: modelInputTypeValues(m),
    framework: modelFrameworkValues(m),
    access: [modelAccessLevel(m)],
    inference:
      validationStatus === "validating"
        ? []
        : [validationStatus === "invalid" ? "추론 불가능" : "추론 가능"],
  }
}

/** Deterministic engagement stats (base data has no downloads for models). */
export function modelStats(m: Model): { downloads: number; usage: number; likes: number } {
  const h = hashStr(m.id)
  return {
    downloads: 800 + (h % 9000),
    usage: 1200 + ((h >>> 3) % 14000),
    likes: 60 + ((h >>> 7) % 900),
  }
}

export function modelDate(m: Model): string {
  return m.versions?.[0]?.date ?? ""
}

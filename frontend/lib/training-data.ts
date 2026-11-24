// Mock data for the AI Training (추가 학습 / Fine-tuning) workflow.
// Structured so real APIs can replace these constants later.

import type { Model, TaskType } from "@/lib/registry-data"

export type TrainingMappingStatus = "auto" | "review" | "excluded"

export interface TrainingMappingRow {
  semanticId: string
  meaning: string
  column: string
  type: string
  confidence: number
  status: TrainingMappingStatus
}

export const TRAINING_MAPPING_ROWS: TrainingMappingRow[] = [
  {
    semanticId: "IDTA:Property:temperature",
    meaning: "온도 (°C)",
    column: "TEMP_01",
    type: "float",
    confidence: 0.96,
    status: "auto",
  },
  {
    semanticId: "IDTA:Property:vibration.velocity",
    meaning: "진동 속도 (mm/s)",
    column: "VIB_VEL",
    type: "float",
    confidence: 0.94,
    status: "auto",
  },
  {
    semanticId: "IDTA:Property:spindle.rpm",
    meaning: "스핀들 회전수 (RPM)",
    column: "RPM_ACT",
    type: "int",
    confidence: 0.31,
    status: "excluded",
  },
  {
    semanticId: "IDTA:Property:motor.current",
    meaning: "모터 전류 (A)",
    column: "MOTOR_A",
    type: "float",
    confidence: 0.62,
    status: "review",
  },
  {
    semanticId: "IDTA:Property:air.pressure",
    meaning: "에어 압력 (bar)",
    column: "AIR_PRESS",
    type: "float",
    confidence: 0.58,
    status: "review",
  },
  {
    semanticId: "IDTA:Property:label.class",
    meaning: "라벨 / 타겟 클래스",
    column: "DEFECT_LABEL",
    type: "string",
    confidence: 0.99,
    status: "auto",
  },
  {
    semanticId: "IDTA:Property:timestamp",
    meaning: "측정 시간",
    column: "TIMESTAMP",
    type: "datetime",
    confidence: 0.4,
    status: "excluded",
  },
]

// Mock LLM validation response. Replace this with the API response later.
export const TRAINING_VALIDATION_RESULTS = [
  {
    title: "결측치 비율 높음",
    description: "결측치가 많아 학습 성능이 저하될 수 있습니다.",
    recommendation: "중앙값으로 결측치 대체",
    detail: "극단값의 영향을 적게 받는 중앙값으로 빈 데이터를 대체합니다.",
  },
  {
    title: "라벨 인코딩 필요",
    description: "문자열 값을 숫자형 라벨로 변환해야 합니다.",
    recommendation: "Label Encoding 적용",
    detail: "문자열 라벨을 모델이 학습할 수 있는 숫자형 클래스 ID로 변환합니다.",
  },
  {
    title: "클래스 불균형",
    description: "소수 클래스가 충분히 학습되지 않을 수 있습니다.",
    recommendation: "Class Weight 적용",
    detail: "소수 클래스가 학습에 충분히 반영되도록 클래스별 가중치를 적용합니다.",
  },
] as const

export const TRAINING_MAPPING_PIPELINE = [
  "스키마 로드",
  "의미 기반 매핑",
  "전처리 생성",
  "검토 및 검증",
] as const

// Column values used both for the upload preview and mapping reference.
export const UPLOAD_PREVIEW_COLUMNS = [
  "TIMESTAMP",
  "AIR_PRESS",
  "TEMP_01",
  "VIB_VEL",
  "RPM_ACT",
  "MOTOR_A",
  "DEFECT_LABEL",
]

export const UPLOAD_PREVIEW_ROWS: string[][] = [
  ["2024-05-28 09:12:04", "5.2", "62.4", "3.12", "1492", "8.4", "NORMAL"],
  ["2024-05-28 09:12:05", "5.1", "62.8", "3.18", "1495", "8.6", "NORMAL"],
  ["2024-05-28 09:12:06", "5.3", "63.1", "7.84", "1521", "12.7", "SOLDER"],
  ["2024-05-28 09:12:07", "5.1", "59.7", "2.94", "1480", "7.9", "NORMAL"],
  ["2024-05-28 09:12:08", "5.2", "60.2", "3.02", "1483", "8.1", "BRIDGE"],
]

export interface ValidationItem {
  label: string
  detail: string
  status: "pass" | "warn"
}

export const VALIDATION_ITEMS: ValidationItem[] = [
  { label: "필수 컬럼 매핑", detail: "7 / 7", status: "pass" },
  { label: "데이터 타입 일치", detail: "7 / 7", status: "pass" },
  { label: "결측치 비율", detail: "1.2% (정상)", status: "pass" },
  { label: "이상치 비율", detail: "0.3% (정상)", status: "pass" },
  { label: "라벨 / 타겟 컬럼", detail: "존재", status: "pass" },
]

// Mock histogram bins for the "데이터 분포" panel.
export interface DistributionSeries {
  title: string
  unit: string
  bins: { bin: string; count: number }[]
}

function bell(peak: number, spread: number, labels: string[]): { bin: string; count: number }[] {
  return labels.map((bin, i) => {
    const count = Math.round(peak * Math.exp(-((i - spread) ** 2) / 6))
    return { bin, count: Math.max(count, 2) }
  })
}

const BIN_LABELS = ["0", "15", "30", "45", "60", "75", "90"]

export const DISTRIBUTION_SERIES: DistributionSeries[] = [
  { title: "온도", unit: "°C", bins: bell(120, 3, BIN_LABELS) },
  { title: "진동 속도", unit: "mm/s", bins: bell(140, 2, BIN_LABELS) },
  { title: "회전수", unit: "RPM", bins: bell(110, 4, BIN_LABELS) },
  { title: "모터 전류", unit: "A", bins: bell(130, 3, BIN_LABELS) },
]

export const TRAINING_LOG_LINES = [
  "데이터 로딩 완료",
  "모델 초기화 완료",
  "Semantic 전처리 완료",
  "학습 시작",
  "Epoch 5 / 20 완료",
  "Epoch 10 / 20 완료",
  "Validation 수행 중",
  "Epoch 15 / 20 완료",
  "Epoch 20 / 20 완료",
  "새 모델 저장 중",
  "학습 완료",
]

export interface PerformanceMetric {
  label: string
  base: number
  next: number
}

// Base vs. newly trained model metrics (0–1 scale).
export const PERFORMANCE_METRICS: PerformanceMetric[] = [
  { label: "mIoU", base: 0.95, next: 0.973 },
  { label: "Precision", base: 0.942, next: 0.964 },
  { label: "Recall", base: 0.931, next: 0.957 },
  { label: "F1 Score", base: 0.936, next: 0.96 },
  { label: "mAP", base: 0.928, next: 0.951 },
]

export const TRAINING_METHODS = ["Fine-tuning", "Transfer Learning", "Full Retrain"] as const
export const LEARNING_RATE_OPTIONS = ["Auto", "0.01", "0.001", "0.0001"] as const
export const GPU_OPTIONS = ["Auto", "NVIDIA A100 ×1", "NVIDIA A100 ×4", "NVIDIA T4 ×1"] as const

/** Primary evaluation metric label + value for a model, matching the Registry convention. */
export function primaryMetric(model: Model): { label: string; value: string } {
  switch (model.task as TaskType) {
    case "Anomaly Detection":
      return { label: "ROC-AUC", value: (0.9 + model.f1 / 1000).toFixed(3) }
    case "Segmentation":
      return { label: "mIoU", value: (model.accuracy / 100).toFixed(3) }
    case "OCR":
      return { label: "정확도", value: (model.accuracy / 100).toFixed(3) }
    case "Classification":
      return { label: "Top-1", value: (model.accuracy / 100).toFixed(3) }
    default:
      return { label: "mAP@50", value: (model.accuracy / 100).toFixed(3) }
  }
}

/** Bump a semantic version's minor number, e.g. v1.5 → v1.6. */
export function nextVersion(version: string): string {
  const match = version.match(/^v?(\d+)\.(\d+)/i)
  if (!match) return `${version}.1`
  const major = Number(match[1])
  const minor = Number(match[2]) + 1
  return `v${major}.${minor}`
}

/**
 * Model Hub instances shown on the registration screen. Required files are
 * derived from `kind`, never assumed globally.
 *
 * `kind: "combined"` is a UI demo case. The current backend registers one
 * file per instance; supporting it needs `requiredFiles[]` on the instance
 * payload and per-file validation results (see BACKEND_GAP below).
 */

export type FileExt = ".pt" | ".zip"
export type InstanceKind = "model" | "dataset" | "combined"
export type Phase = "draft" | "validating" | "passed" | "failed"

export type FileSlot = { ext: FileExt; label: string; hint: string; checks: string[]; sampleName: string; sampleSize: number }

export interface HubInstance {
  id: string
  name: string
  kind: InstanceKind
  hubId: string
  uploadedAt: string
  purpose: string
  link?: { href: string; label: string }
  meta: { label: string; value: string }[]
  /** Which check (flat index across all slots) fails when the demo outcome is "fail". */
  failure: { check: number; title: string; detail: string }
  demoOnly?: boolean
}

export type AttachedFile = { name: string; size: number }

export interface AssetState {
  files: Partial<Record<FileExt, AttachedFile>>
  phase: Phase
  step: number
  outcome: "pass" | "fail"
}

const MODEL_SLOT = (sampleName: string, sampleSize: number): FileSlot => ({
  ext: ".pt",
  label: "모델 파일",
  hint: "학습이 끝난 AI 가중치 파일이에요.",
  checks: ["파일 무결성", "모델 불러오기", "입력·출력 형식", "샘플 추론"],
  sampleName,
  sampleSize,
})

const DATASET_SLOT = (sampleName: string, sampleSize: number): FileSlot => ({
  ext: ".zip",
  label: "데이터 파일",
  hint: "이미지·라벨 또는 CSV를 담은 압축 파일이에요.",
  checks: ["압축 해제", "파일 구성", "라벨 일치", "데이터 구조"],
  sampleName,
  sampleSize,
})

export const HUB_INSTANCES: HubInstance[] = [
  {
    id: "weld-qc-bundle",
    name: "용접 비드 품질 검사 패키지",
    kind: "combined",
    demoOnly: true,
    hubId: "urn:aas:weld-qc-bundle:v1",
    uploadedAt: "2026-11-23",
    purpose: "용접 비드 불량 분류 모델과, 그 모델을 학습·평가한 이미지 데이터를 한 instance로 묶었어요.",
    meta: [
      { label: "구성", value: "AI 모델 + AI 데이터셋" },
      { label: "AI Task", value: "Classification" },
      { label: "입력", value: "224×224 RGB 이미지" },
      { label: "라벨", value: "양품·불량 2종" },
    ],
    failure: {
      check: 6,
      title: "데이터 라벨이 모델 출력 클래스와 달라요",
      detail: "모델은 2개 클래스(양품·불량)를 내지만 데이터에는 3개 라벨(양품·불량·보류)이 있습니다. 라벨을 맞춘 .zip으로 다시 올려 주세요. 모델 파일 검증은 통과했어요.",
    },
  },
  {
    id: "surface-seg",
    name: "표면 결함 세그멘테이션",
    kind: "model",
    hubId: "urn:aas:surface-seg:v3",
    uploadedAt: "2026-11-21",
    purpose: "강판 표면 사진에서 결함이 있는 영역을 픽셀 단위로 표시해요.",
    meta: [
      { label: "프레임워크", value: "PyTorch 2.3" },
      { label: "AI Task", value: "Segmentation" },
      { label: "입력", value: "512×512 RGB 이미지" },
      { label: "출력", value: "결함 클래스 8종" },
    ],
    failure: {
      check: 2,
      title: "입력 형식이 instance 정보와 달라요",
      detail: "instance에는 512×512 입력으로 적혀 있지만, 올린 모델은 640×640 입력을 기대합니다. 올바른 .pt 파일로 교체하거나 Model Hub에서 instance 정보를 수정해 주세요.",
    },
  },
  {
    id: "car-exterior-ds",
    name: "자동차 외관 이미지 데이터셋",
    kind: "dataset",
    hubId: "urn:aas:car-exterior-ds:v1",
    uploadedAt: "2026-11-20",
    purpose: "도장 후 차체 외관 사진 모음이에요. 외관 검사 AI를 학습·평가하는 데 쓰여요.",
    link: { href: "/datasets/car-exterior", label: "데이터셋 보기" },
    meta: [
      { label: "데이터 유형", value: "이미지" },
      { label: "규모", value: "4,820장" },
      { label: "라벨", value: "8종 · COCO 형식" },
      { label: "수집 공정", value: "도장 후 외관 검사" },
    ],
    failure: { check: 2, title: "라벨이 없는 이미지가 있어요", detail: "이미지 12장에 대응하는 라벨 파일을 찾지 못했습니다. 라벨을 채운 .zip 파일로 다시 올려 주세요." },
  },
  {
    id: "motor-lstm",
    name: "모터 진동 이상 탐지 LSTM",
    kind: "model",
    hubId: "urn:aas:motor-lstm:v2",
    uploadedAt: "2026-11-18",
    purpose: "모터 진동 기록으로 고장 징후를 미리 알아채요.",
    link: { href: "/models/predictive-maintenance", label: "AI 소개 보기" },
    meta: [
      { label: "프레임워크", value: "PyTorch 2.1" },
      { label: "AI Task", value: "Anomaly Detection" },
      { label: "입력", value: "진동 시계열 3축 · 1kHz" },
      { label: "출력", value: "이상 점수 (0–1)" },
    ],
    failure: { check: 3, title: "샘플 추론 결과가 안내된 성능과 달라요", detail: "샘플 20건으로 실행한 결과가 instance에 적힌 성능보다 크게 낮습니다. 학습이 끝난 가중치 파일인지 확인해 주세요." },
  },
  {
    id: "press-log-ds",
    name: "프레스 센서 로그",
    kind: "dataset",
    hubId: "urn:aas:press-log-ds:v4",
    uploadedAt: "2026-11-10",
    purpose: "프레스 3호기의 압력·온도 기록과 불량 여부를 함께 담은 데이터예요.",
    meta: [
      { label: "데이터 유형", value: "시계열 (CSV)" },
      { label: "규모", value: "38일 · 1.2억 행" },
      { label: "라벨", value: "불량 여부" },
      { label: "수집 공정", value: "프레스 3호기" },
    ],
    failure: { check: 3, title: "컬럼 이름이 instance와 달라요", detail: "instance에는 'pressure_kN' 컬럼이 있지만 파일에는 'pressure'로 되어 있습니다. 컬럼 이름을 맞춘 .zip 파일로 다시 올려 주세요." },
  },
  {
    id: "yolo-exterior",
    name: "YOLOv8 자동차 외관 검사",
    kind: "model",
    hubId: "urn:aas:yolo-exterior:v2.3",
    uploadedAt: "2026-11-02",
    purpose: "차체 사진에서 스크래치·찍힘 같은 외관 결함의 위치를 찾아요.",
    link: { href: "/models/yolov8-car-inspection", label: "AI 소개 보기" },
    meta: [
      { label: "프레임워크", value: "PyTorch · YOLOv8x" },
      { label: "AI Task", value: "Object Detection" },
      { label: "입력", value: "640×640 RGB 이미지" },
      { label: "출력", value: "결함 위치 + 클래스 8종" },
    ],
    failure: { check: 2, title: "입력 형식이 달라요", detail: "입력 크기를 확인해 주세요." },
  },
]

export function slotsOf(inst: HubInstance): FileSlot[] {
  const base = inst.id.replace(/-/g, "_")
  if (inst.kind === "model") return [MODEL_SLOT(`${base}.pt`, 86_400_000)]
  if (inst.kind === "dataset") return [DATASET_SLOT(`${base}.zip`, 640_000_000)]
  return [MODEL_SLOT(`${base}_model.pt`, 52_300_000), DATASET_SLOT(`${base}_data.zip`, 410_000_000)]
}

/** Flat check list across slots, in validation order. */
export function checksOf(inst: HubInstance) {
  return slotsOf(inst).flatMap((s) => s.checks.map((name) => ({ ext: s.ext, name })))
}

export const KIND_LABEL: Record<InstanceKind, string> = { model: "모델", dataset: "데이터셋", combined: "모델 + 데이터셋" }

export const INITIAL_STATES: Record<string, AssetState> = {
  "weld-qc-bundle": { files: {}, phase: "draft", step: 0, outcome: "pass" },
  "surface-seg": { files: {}, phase: "draft", step: 0, outcome: "pass" },
  "car-exterior-ds": { files: {}, phase: "draft", step: 0, outcome: "fail" },
  "motor-lstm": { files: { ".pt": { name: "motor_lstm_v2.pt", size: 48_200_000 } }, phase: "draft", step: 0, outcome: "pass" },
  "press-log-ds": { files: { ".zip": { name: "press3_log_38d.zip", size: 3_900_000_000 } }, phase: "failed", step: 3, outcome: "fail" },
  "yolo-exterior": { files: { ".pt": { name: "yolov8x_exterior.pt", size: 136_700_000 } }, phase: "passed", step: 4, outcome: "pass" },
}

export type ListStatus = "needs-file" | "ready" | "validating" | "passed" | "failed"

export function missingSlots(inst: HubInstance, state: AssetState) {
  return slotsOf(inst).filter((s) => !state.files[s.ext])
}

export function listStatus(inst: HubInstance, state: AssetState): ListStatus {
  if (state.phase === "draft") return missingSlots(inst, state).length ? "needs-file" : "ready"
  return state.phase
}

export function formatSize(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`
}

export const BACKEND_GAP = [
  "instance 응답에 필요한 파일 목록(requiredFiles: [{ kind: 'model' | 'dataset', ext }])을 포함",
  "등록 API가 한 instance에 여러 파일을 받도록 multipart 또는 파일별 업로드 ID 지원",
  "검증 결과를 파일별(model / dataset)로 나눠 반환하고, 모델 출력 클래스와 데이터 라벨 일치 검사 추가",
]

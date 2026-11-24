export type AssetType = "model" | "dataset"
export type Phase = "draft" | "validating" | "passed" | "failed"
export type Outcome = "pass" | "fail"

export interface HubInstance {
  id: string
  name: string
  type: AssetType
  hubId: string
  uploadedAt: string
  requiredExt: ".pt" | ".zip"
  meta: { label: string; value: string }[]
  checks: string[]
  failure: { check: number; title: string; detail: string }
}

export interface AttachedFile {
  name: string
  size: number
}

export interface AssetState {
  file: AttachedFile | null
  phase: Phase
  step: number
  outcome: Outcome
}

const MODEL_CHECKS = ["파일 무결성", "모델 불러오기", "입력·출력 형식", "샘플 추론"]
const DATASET_CHECKS = ["압축 해제", "파일 구성", "라벨 일치", "데이터 구조"]

export const HUB_INSTANCES: HubInstance[] = [
  {
    id: "surface-seg",
    name: "표면 결함 세그멘테이션",
    type: "model",
    hubId: "urn:aas:surface-seg:v3",
    uploadedAt: "2026-11-21",
    requiredExt: ".pt",
    meta: [
      { label: "프레임워크", value: "PyTorch 2.3" },
      { label: "AI Task", value: "Segmentation" },
      { label: "입력", value: "512×512 RGB 이미지" },
      { label: "출력", value: "결함 클래스 8종" },
    ],
    checks: MODEL_CHECKS,
    failure: {
      check: 2,
      title: "입력 형식이 instance 정보와 달라요",
      detail: "instance에는 512×512 입력으로 적혀 있지만, 올린 모델은 640×640 입력을 기대합니다. 올바른 .pt 파일로 교체하거나 Model Hub에서 instance 정보를 수정해 주세요.",
    },
  },
  {
    id: "car-exterior-ds",
    name: "자동차 외관 이미지 데이터셋",
    type: "dataset",
    hubId: "urn:aas:car-exterior-ds:v1",
    uploadedAt: "2026-11-20",
    requiredExt: ".zip",
    meta: [
      { label: "데이터 유형", value: "이미지" },
      { label: "규모", value: "4,820장" },
      { label: "라벨", value: "8종 · COCO 형식" },
      { label: "수집 공정", value: "도장 후 외관 검사" },
    ],
    checks: DATASET_CHECKS,
    failure: {
      check: 2,
      title: "라벨이 없는 이미지가 있어요",
      detail: "이미지 12장에 대응하는 라벨 파일을 찾지 못했습니다. 라벨을 채운 .zip 파일로 다시 올려 주세요.",
    },
  },
  {
    id: "motor-lstm",
    name: "모터 진동 이상 탐지 LSTM",
    type: "model",
    hubId: "urn:aas:motor-lstm:v2",
    uploadedAt: "2026-11-18",
    requiredExt: ".pt",
    meta: [
      { label: "프레임워크", value: "PyTorch 2.1" },
      { label: "AI Task", value: "Anomaly Detection" },
      { label: "입력", value: "진동 시계열 3축 · 1kHz" },
      { label: "출력", value: "이상 점수 (0–1)" },
    ],
    checks: MODEL_CHECKS,
    failure: {
      check: 3,
      title: "샘플 추론 결과가 안내된 성능과 달라요",
      detail: "샘플 20건으로 실행한 결과가 instance에 적힌 성능보다 크게 낮습니다. 학습이 끝난 가중치 파일인지 확인해 주세요.",
    },
  },
  {
    id: "weld-bead-ds",
    name: "용접 비드 이미지",
    type: "dataset",
    hubId: "urn:aas:weld-bead-ds:v1",
    uploadedAt: "2026-11-14",
    requiredExt: ".zip",
    meta: [
      { label: "데이터 유형", value: "이미지" },
      { label: "규모", value: "2,140장" },
      { label: "라벨", value: "양품·불량 2종" },
      { label: "수집 공정", value: "로봇 용접 라인 2" },
    ],
    checks: DATASET_CHECKS,
    failure: { check: 1, title: "폴더 구성이 달라요", detail: "images/ 와 labels/ 폴더가 필요합니다." },
  },
  {
    id: "press-log-ds",
    name: "프레스 센서 로그",
    type: "dataset",
    hubId: "urn:aas:press-log-ds:v4",
    uploadedAt: "2026-11-10",
    requiredExt: ".zip",
    meta: [
      { label: "데이터 유형", value: "시계열 (CSV)" },
      { label: "규모", value: "38일 · 1.2억 행" },
      { label: "라벨", value: "불량 여부" },
      { label: "수집 공정", value: "프레스 3호기" },
    ],
    checks: DATASET_CHECKS,
    failure: {
      check: 3,
      title: "컬럼 이름이 instance와 달라요",
      detail: "instance에는 'pressure_kN' 컬럼이 있지만 파일에는 'pressure'로 되어 있습니다. 컬럼 이름을 맞춘 .zip 파일로 다시 올려 주세요.",
    },
  },
  {
    id: "yolo-exterior",
    name: "YOLOv8 자동차 외관 검사",
    type: "model",
    hubId: "urn:aas:yolo-exterior:v2.3",
    uploadedAt: "2026-11-02",
    requiredExt: ".pt",
    meta: [
      { label: "프레임워크", value: "PyTorch · YOLOv8x" },
      { label: "AI Task", value: "Object Detection" },
      { label: "입력", value: "640×640 RGB 이미지" },
      { label: "출력", value: "결함 위치 + 클래스 8종" },
    ],
    checks: MODEL_CHECKS,
    failure: { check: 2, title: "입력 형식이 달라요", detail: "입력 크기를 확인해 주세요." },
  },
]

export const INITIAL_STATES: Record<string, AssetState> = {
  "surface-seg": { file: null, phase: "draft", step: 0, outcome: "pass" },
  "car-exterior-ds": { file: null, phase: "draft", step: 0, outcome: "fail" },
  "motor-lstm": { file: { name: "motor_lstm_v2.pt", size: 48_200_000 }, phase: "draft", step: 0, outcome: "pass" },
  "weld-bead-ds": { file: { name: "weld_bead_2026q4.zip", size: 1_420_000_000 }, phase: "passed", step: 4, outcome: "pass" },
  "press-log-ds": { file: { name: "press3_log_38d.zip", size: 3_900_000_000 }, phase: "failed", step: 3, outcome: "fail" },
  "yolo-exterior": { file: { name: "yolov8x_exterior.pt", size: 136_700_000 }, phase: "passed", step: 4, outcome: "pass" },
}

export type ListStatus = "needs-file" | "ready" | "validating" | "passed" | "failed"

export function listStatus(state: AssetState): ListStatus {
  if (state.phase === "draft") return state.file ? "ready" : "needs-file"
  return state.phase
}

export const STATUS_LABEL: Record<ListStatus, string> = {
  "needs-file": "파일 필요",
  ready: "등록 가능",
  validating: "검증 중",
  passed: "검증 완료",
  failed: "확인 필요",
}

export const TYPE_LABEL: Record<AssetType, string> = { model: "모델", dataset: "데이터셋" }

export function formatSize(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`
}

export type StepState = "done" | "active" | "todo" | "warn" | "locked"
export type ConceptScreen = "register" | "verify"
export type ConceptId = "a" | "b" | "c"

export const hubAccount = { id: "kim.qa", org: "스마트공장 품질팀" }

export type HubInstance = {
  id: string
  name: string
  source: string
  updated: string
  task: string
  hasDataset: boolean
  hasModel: boolean
  blockedReason?: string
}

export const hubInstances: HubInstance[] = [
  {
    id: "urn:aas:surface-inspection:v3",
    name: "Surface Inspection AAS",
    source: "Factory AAS Repository",
    updated: "2026-07-14",
    task: "Segmentation",
    hasDataset: true,
    hasModel: true,
  },
  {
    id: "urn:aas:motor-pdm:v1",
    name: "Motor PdM AAS",
    source: "Factory AAS Repository",
    updated: "2026-06-28",
    task: "Anomaly Detection",
    hasDataset: true,
    hasModel: true,
  },
  {
    id: "urn:aas:legacy-vision:v0",
    name: "Legacy Vision Dataset AAS",
    source: "Legacy AAS Repository",
    updated: "2026-05-19",
    task: "Classification",
    hasDataset: true,
    hasModel: false,
    blockedReason: "AI ModelNameplate가 없어 등록할 수 없어요",
  },
]

export const selectedInstance = hubInstances[0]

export const extracted = {
  model: {
    name: "RGB 결함 세그멘테이션",
    framework: "PyTorch 2.3",
    input: "512×512 RGB 이미지",
    output: "결함 마스크 4종",
    reportedMetric: "mIoU 0.95 (제공자 기준)",
  },
  dataset: {
    name: "RGB 결함 이미지 데이터셋",
    type: "이미지 + 마스크 라벨",
    classes: ["스크래치", "찍힘", "오염", "정상"],
    count: "4,820장",
  },
}

export type UploadSlot = {
  kind: "model" | "data"
  label: string
  ext: string
  fileName: string
  size: string
  progress: number
  state: StepState
  note: string
}

export const uploads: UploadSlot[] = [
  {
    kind: "model",
    label: "모델 파일",
    ext: ".pt",
    fileName: "surface_seg_v3.pt",
    size: "128.4 MB",
    progress: 100,
    state: "done",
    note: "업로드 완료",
  },
  {
    kind: "data",
    label: "데이터 파일",
    ext: ".zip",
    fileName: "surface_defect_2026q2.zip",
    size: "2.1 GB",
    progress: 64,
    state: "active",
    note: "업로드 중 · 약 2분 남음",
  },
]

export const canCompleteRegistration = uploads.every((u) => u.state === "done")
export const registrationBlocker = "데이터 파일 업로드가 끝나면 등록을 완료할 수 있어요"

export type VerificationCheck = {
  id: string
  target: "model" | "data"
  label: string
  plain: string
  technical: string
  state: StepState
  time: string
}

export const verificationChecks: VerificationCheck[] = [
  {
    id: "integrity",
    target: "model",
    label: "파일 무결성",
    plain: "파일이 손상 없이 올라왔어요",
    technical: "SHA-256 일치 · 128.4 MB",
    state: "done",
    time: "14:02:11",
  },
  {
    id: "load",
    target: "model",
    label: "모델 불러오기",
    plain: "모델을 정상적으로 열 수 있어요",
    technical: "torch.load OK · PyTorch 2.3 · CUDA 12.1",
    state: "done",
    time: "14:02:19",
  },
  {
    id: "io",
    target: "model",
    label: "입력·출력 형식",
    plain: "instance에 적힌 입력 형식과 일치해요",
    technical: "input [1,3,512,512] · output [1,4,512,512]",
    state: "done",
    time: "14:02:24",
  },
  {
    id: "sample",
    target: "model",
    label: "샘플 추론",
    plain: "샘플 20장으로 실행해 보니 성능이 안내된 값과 비슷해요",
    technical: "mIoU 0.94 (보고값 0.95) · 평균 38 ms/장",
    state: "done",
    time: "14:03:02",
  },
  {
    id: "labels",
    target: "data",
    label: "데이터 구조",
    plain: "이미지 12장에 라벨 파일이 없어요. 학습 전에 확인이 필요해요",
    technical: "images 4,820 · masks 4,808 · missing 12",
    state: "warn",
    time: "14:03:40",
  },
]

export const verificationSummary = {
  passed: verificationChecks.filter((c) => c.state === "done").length,
  warned: verificationChecks.filter((c) => c.state === "warn").length,
  total: verificationChecks.length,
}

export type NextAction = {
  id: "infer" | "train" | "publish"
  label: string
  description: string
  state: StepState
  reason?: string
}

export const nextActions: NextAction[] = [
  {
    id: "infer",
    label: "샘플로 추론해 보기",
    description: "내 이미지나 제공 샘플을 넣어 결함 마스크를 바로 확인해요",
    state: "done",
  },
  {
    id: "train",
    label: "내 데이터로 추가 학습",
    description: "자동 전처리 후 이 모델을 내 데이터에 맞게 다시 학습해요",
    state: "warn",
    reason: "라벨 없는 이미지 12장을 제외하거나 보완하면 시작할 수 있어요",
  },
  {
    id: "publish",
    label: "연계 자산으로 공개",
    description: "팀원이 이 모델·데이터 조합을 탐색하고 사용할 수 있게 해요",
    state: "done",
  },
]

export type LibraryAsset = {
  id: string
  name: string
  model: string
  dataset: string
  task: string
  status: "draft" | "verified" | "warn" | "verifying"
  updated: string
}

export const libraryAssets: LibraryAsset[] = [
  {
    id: "surface",
    name: "Surface Inspection AAS",
    model: "RGB 결함 세그멘테이션",
    dataset: "RGB 결함 이미지 데이터셋",
    task: "Segmentation",
    status: "draft",
    updated: "방금",
  },
  {
    id: "motor",
    name: "Motor PdM AAS",
    model: "모터 이상 탐지 LSTM",
    dataset: "모터 진동 시계열",
    task: "Anomaly Detection",
    status: "verified",
    updated: "2일 전",
  },
  {
    id: "weld",
    name: "Weld Bead AAS",
    model: "용접 비드 분류",
    dataset: "용접 비드 이미지",
    task: "Classification",
    status: "verifying",
    updated: "5일 전",
  },
  {
    id: "press",
    name: "Press Line AAS",
    model: "프레스 불량 예측",
    dataset: "프레스 센서 로그",
    task: "Regression",
    status: "verified",
    updated: "2주 전",
  },
]

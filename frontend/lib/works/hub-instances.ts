/**
 * Model Hub instances shown on the registration screen.
 *
 * `imported` is read from the instance (AAS) and is never editable here.
 * Everything in `AssetState.model` / `AssetState.dataset` is entered by the
 * user. Which groups appear is derived from `kind`.
 *
 * No registration API exists in this repository yet (the original flow keeps
 * `fileUploadEnabled = false`), so registration and validation are simulated.
 */
import {
  assetOption,
  dataCategoryFromFileType,
  emptyDataset,
  emptyModel,
  requiredFields,
  validateDataset,
  validateModel,
  type AttachedFile,
  type DatasetForm,
  type ModelForm,
} from "@/lib/works/register-fields"

export type Group = "model" | "dataset"
export type InstanceKind = "model" | "dataset" | "combined"
export type Phase = "edit" | "review" | "registering" | "validating" | "passed" | "failed"

export interface HubInstance {
  id: string
  name: string
  kind: InstanceKind
  hubId: string
  uploadedAt: string
  purpose: string
  link?: { href: string; label: string }
  imported: { author: string; version: string; framework?: string; datasetFileType?: string; hubTask?: string }
  meta: { label: string; value: string }[]
  /** Which validation check fails when the demo outcome is "fail". */
  failure: { group: Group; check: string; title: string; detail: string }
  sample: { model?: Partial<ModelForm>; dataset?: Partial<DatasetForm>; files: Partial<Record<Group, AttachedFile>> }
  prototype?: boolean
}

export interface AssetState {
  phase: Phase
  step: number
  outcome: "pass" | "fail"
  model: ModelForm
  dataset: DatasetForm
  files: Partial<Record<Group, AttachedFile>>
}

export const HUB_INSTANCES: HubInstance[] = [
  {
    id: "weld-qc-bundle",
    name: "용접 비드 품질 검사 패키지",
    kind: "combined",
    prototype: true,
    hubId: "urn:aas:weld-qc-bundle:v1",
    uploadedAt: "2026-11-23",
    purpose: "용접 비드 불량 분류 모델과, 그 모델을 학습·평가한 이미지 데이터를 한 instance로 묶었어요.",
    imported: { author: "kim.qc@keti.re.kr", version: "v1.0", framework: "PyTorch 2.3", datasetFileType: "png", hubTask: "Classification" },
    meta: [
      { label: "구성", value: "AI ModelNameplate + AI Dataset Submodel" },
      { label: "입력", value: "224×224 RGB 이미지" },
      { label: "라벨", value: "양품·불량 2종" },
    ],
    failure: {
      group: "dataset",
      check: "라벨·카테고리 일치",
      title: "데이터 라벨이 모델 출력 클래스와 달라요",
      detail: "모델은 2개 클래스(양품·불량)를 내지만 데이터에는 3개 라벨(양품·불량·보류)이 있습니다. 라벨을 맞춘 파일로 데이터셋만 다시 올려 주세요. 모델 검증은 통과했어요.",
    },
    sample: {
      model: { title: "용접 비드 불량 분류 v1", task: "Classification", summary: "용접 직후 비드 사진을 양품·불량으로 분류합니다.", keywords: ["검사", "불량"], dependencyReference: "registry://models/effnet-weld-code:v1" },
      dataset: { title: "용접 비드 이미지 6천 장", detailType: "검사 이미지", task: "Classification", summary: "용접 라인 2곳에서 수집한 비드 사진과 양품·불량 라벨입니다.", keywords: ["검사", "공정"] },
      files: { model: { name: "weld_qc_effnet.safetensors", size: 52_300_000 }, dataset: { name: "weld_bead_images.zip", size: 410_000_000 } },
    },
  },
  {
    id: "surface-seg",
    name: "표면 결함 세그멘테이션",
    kind: "model",
    hubId: "urn:aas:surface-seg:v3",
    uploadedAt: "2026-11-21",
    purpose: "강판 표면 사진에서 결함이 있는 영역을 픽셀 단위로 표시해요.",
    imported: { author: "lee.vision@keti.re.kr", version: "v3.0", framework: "PyTorch 2.3", hubTask: "Segmentation" },
    meta: [
      { label: "입력", value: "512×512 RGB 이미지" },
      { label: "출력", value: "결함 클래스 8종" },
    ],
    failure: {
      group: "model",
      check: "입력·출력 형식",
      title: "입력 형식이 instance 정보와 달라요",
      detail: "instance에는 512×512 입력으로 적혀 있지만, 올린 모델은 640×640 입력을 기대합니다. 올바른 가중치 파일로 교체하거나 Model Hub에서 instance 정보를 수정해 주세요.",
    },
    sample: {
      model: { title: "강판 표면 결함 세그멘테이션 v3", task: "Segmentation", summary: "강판 표면 결함 영역을 8종으로 나눠 표시합니다.", keywords: ["검사", "불량"], dependencyReference: "registry://models/segformer-code:v3" },
      files: { model: { name: "surface_seg_v3.pt", size: 86_400_000 } },
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
    imported: { author: "park.auto@keti.re.kr", version: "v1.0", datasetFileType: "jpg" },
    meta: [
      { label: "규모", value: "4,820장" },
      { label: "라벨", value: "8종 · COCO 형식" },
      { label: "수집 공정", value: "도장 후 외관 검사" },
    ],
    failure: { group: "dataset", check: "라벨·카테고리 일치", title: "라벨이 없는 이미지가 있어요", detail: "이미지 12장에 대응하는 라벨을 찾지 못했습니다. 라벨을 채운 파일로 다시 올려 주세요." },
    sample: {
      dataset: { title: "자동차 외관 결함 이미지", detailType: "결함 이미지", task: "Object Detection", summary: "도장 후 차체 외관 사진 4,820장과 결함 8종 위치 라벨입니다.", keywords: ["검사", "불량"] },
      files: { dataset: { name: "car_exterior_coco.zip", size: 640_000_000 } },
    },
  },
  {
    id: "motor-lstm",
    name: "모터 진동 이상 탐지 LSTM",
    kind: "model",
    hubId: "urn:aas:motor-lstm:v2",
    uploadedAt: "2026-11-18",
    purpose: "모터 진동 기록으로 고장 징후를 미리 알아채요.",
    link: { href: "/models/predictive-maintenance", label: "AI 소개 보기" },
    imported: { author: "choi.pdm@keti.re.kr", version: "v2.0", framework: "PyTorch 2.1", hubTask: "Anomaly Detection" },
    meta: [
      { label: "입력", value: "진동 시계열 3축 · 1kHz" },
      { label: "출력", value: "이상 점수 (0–1)" },
    ],
    failure: { group: "model", check: "샘플 추론", title: "샘플 추론 결과가 안내된 성능과 달라요", detail: "샘플 20건으로 실행한 결과가 instance에 적힌 성능보다 크게 낮습니다. 학습이 끝난 가중치 파일인지 확인해 주세요." },
    sample: {
      model: { title: "모터 진동 이상 탐지 v2", task: "Anomaly Detection", summary: "3축 진동 기록으로 모터 이상 점수를 계산합니다.", keywords: ["예측", "센서"], dependencyReference: "registry://models/lstm-pdm-code:v2" },
      files: { model: { name: "motor_lstm_v2.pt", size: 48_200_000 } },
    },
  },
  {
    id: "press-log-ds",
    name: "프레스 센서 로그",
    kind: "dataset",
    hubId: "urn:aas:press-log-ds:v4",
    uploadedAt: "2026-11-10",
    purpose: "프레스 3호기의 압력·온도 기록과 불량 여부를 함께 담은 데이터예요.",
    imported: { author: "jung.press@keti.re.kr", version: "v4.0", datasetFileType: "csv" },
    meta: [
      { label: "규모", value: "38일 · 1.2억 행" },
      { label: "라벨", value: "불량 여부" },
    ],
    failure: { group: "dataset", check: "데이터 구조", title: "컬럼 이름이 instance와 달라요", detail: "instance에는 'pressure_kN' 컬럼이 있지만 파일에는 'pressure'로 되어 있습니다. 컬럼 이름을 맞춘 파일로 다시 올려 주세요." },
    sample: {
      dataset: { title: "프레스 3호기 센서 로그", detailType: "센서 데이터", task: "Anomaly Detection", summary: "프레스 3호기의 압력·온도 1초 단위 기록과 불량 여부입니다.", keywords: ["센서", "공정"] },
      files: { dataset: { name: "press3_log_38d.parquet", size: 3_900_000_000 } },
    },
  },
  {
    id: "yolo-exterior",
    name: "YOLOv8 자동차 외관 검사",
    kind: "model",
    hubId: "urn:aas:yolo-exterior:v2.3",
    uploadedAt: "2026-11-02",
    purpose: "차체 사진에서 스크래치·찍힘 같은 외관 결함의 위치를 찾아요.",
    link: { href: "/models/yolov8-car-inspection", label: "AI 소개 보기" },
    imported: { author: "park.auto@keti.re.kr", version: "v2.3", framework: "PyTorch · YOLOv8x", hubTask: "Object Detection" },
    meta: [
      { label: "입력", value: "640×640 RGB 이미지" },
      { label: "출력", value: "결함 위치 + 클래스 8종" },
    ],
    failure: { group: "model", check: "입력·출력 형식", title: "입력 형식이 달라요", detail: "입력 크기를 확인해 주세요." },
    sample: {
      model: { title: "YOLOv8 외관 결함 검출 v2.3", task: "Object Detection", summary: "차체 사진에서 결함 위치와 종류 8종을 찾습니다.", keywords: ["검사", "불량"], dependencyReference: "registry://models/yolov8-code:v1" },
      files: { model: { name: "yolov8x_exterior.pt", size: 136_700_000 } },
    },
  },
]

export const KIND_LABEL: Record<InstanceKind, string> = { model: "모델", dataset: "데이터셋", combined: "모델 + 데이터셋" }
export const GROUP_LABEL: Record<Group, string> = { model: "모델", dataset: "데이터셋" }

export function groupsOf(inst: HubInstance): Group[] {
  return inst.kind === "combined" ? ["model", "dataset"] : [inst.kind]
}

export const datasetCategory = (inst: HubInstance) => dataCategoryFromFileType(inst.imported.datasetFileType ?? "")

export function sampleFilled(inst: HubInstance, group: Group, current: AssetState): Partial<AssetState> {
  if (group === "model") return { model: { ...current.model, ...inst.sample.model }, files: { ...current.files, model: inst.sample.files.model } }
  return { dataset: { ...current.dataset, ...inst.sample.dataset }, files: { ...current.files, dataset: inst.sample.files.dataset } }
}

function blank(): AssetState {
  return { phase: "edit", step: 0, outcome: "pass", model: emptyModel(), dataset: emptyDataset(), files: {} }
}

function filled(inst: HubInstance, extra: Partial<AssetState>): AssetState {
  let s = blank()
  for (const g of groupsOf(inst)) s = { ...s, ...sampleFilled(inst, g, s) }
  return { ...s, ...extra }
}

const byId = (id: string) => HUB_INSTANCES.find((i) => i.id === id)!

export const INITIAL_STATES: Record<string, AssetState> = {
  "weld-qc-bundle": blank(),
  "surface-seg": blank(),
  "car-exterior-ds": { ...blank(), outcome: "fail" },
  // Partially filled: file is up but the structure/code reference is still missing.
  "motor-lstm": {
    ...blank(),
    model: { ...emptyModel(), title: "모터 진동 이상 탐지 v2", task: "Anomaly Detection" },
    files: { model: { name: "motor_lstm_v2.pt", size: 48_200_000 } },
  },
  "press-log-ds": filled(byId("press-log-ds"), { phase: "failed", step: 3, outcome: "fail" }),
  "yolo-exterior": filled(byId("yolo-exterior"), { phase: "passed", step: 5 }),
}

export function errorsOf(group: Group, s: AssetState) {
  return group === "model" ? validateModel(s.model, s.files.model) : validateDataset(s.dataset, s.files.dataset)
}

export function readiness(inst: HubInstance, s: AssetState) {
  const groups = groupsOf(inst).map((g) => {
    const errors = errorsOf(g, s)
    const fields = requiredFields(g, s.model)
    const missing = fields.filter((f) => errors[f.key])
    return { group: g, total: fields.length, done: fields.length - missing.length, missing, errors }
  })
  const total = groups.reduce((n, g) => n + g.total, 0)
  const done = groups.reduce((n, g) => n + g.done, 0)
  return { groups, total, done, ready: done === total }
}

export function checksOf(inst: HubInstance, s: AssetState): { group: Group; name: string }[] {
  return groupsOf(inst).flatMap((g): { group: Group; name: string }[] => {
    if (g === "dataset") return ["파일 열기", "파일 구성", "라벨·카테고리 일치", "데이터 구조"].map((name) => ({ group: g, name }))
    const opt = assetOption(s.model.assetType)
    const names =
      opt.source === "reference"
        ? ["참조 주소 확인", "연결 테스트", "입력·출력 형식"]
        : ["파일 형식", "모델 불러오기", ...(opt.dependencyLabel ? ["구조·코드 참조 연결"] : []), "입력·출력 형식", "샘플 추론"]
    return names.map((name) => ({ group: g, name }))
  })
}

/** Index in `checksOf` where the demo failure stops validation. */
export function failIndex(inst: HubInstance, s: AssetState) {
  const checks = checksOf(inst, s)
  const exact = checks.findIndex((c) => c.group === inst.failure.group && c.name === inst.failure.check)
  if (exact >= 0) return exact
  const lastOfGroup = checks.map((c) => c.group).lastIndexOf(inst.failure.group)
  return lastOfGroup >= 0 ? lastOfGroup : checks.length - 1
}

export type ListStatus = "editing" | "ready" | "review" | "validating" | "passed" | "failed"

export function listStatus(inst: HubInstance, s: AssetState): ListStatus {
  if (s.phase === "edit") return readiness(inst, s).ready ? "ready" : "editing"
  if (s.phase === "registering") return "validating"
  return s.phase
}

export function formatSize(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`
}

export const BACKEND_GAP = [
  "저장소에 자산 등록 API가 없어요. 기존 등록 화면도 fileUploadEnabled = false로 업로드를 막아 두었고, 입력값은 화면 안에서만 쓰입니다.",
  "등록 요청 예시: POST /registrations { instanceId, model?: { title, assetType, task, visibility, summary, keywords[], artifactReference?, dependencyReference? }, dataset?: { title, detailType, task, visibility, summary, keywords[] } } + 파일 multipart(model, dataset)",
  "모델 + 데이터셋 instance는 하나의 등록 ID로 두 그룹을 함께 받아, 둘 다 성공해야 '등록 완료'가 되어야 해요.",
  "검증 결과를 그룹별(model / dataset)로 반환하고, 모델 출력 클래스와 데이터 라벨이 맞는지 확인하는 검사가 필요해요.",
  "데이터 카테고리는 AAS Metadata.Filetype에서 계산해요. 서버가 같은 규칙으로 계산해 응답에 포함하면 화면 계산을 없앨 수 있어요.",
]

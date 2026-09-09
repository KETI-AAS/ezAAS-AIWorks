// Central mock data for the AI Model Registry platform.
// All pages read from here so relationships (traceability) stay consistent.

export type Framework = "PyTorch" | "TensorFlow" | "ONNX" | "TensorRT"

export interface DatasetClass {
  label: string
  value: number
}

export interface VersionEntry {
  version: string
  date: string
  author: string
  changes: string
}

export interface QualityMetric {
  label: string
  value: number
  description: string
}

export interface DatasetStorage {
  type: string
  basePath: string
  uri: string
  fileType: string
  annotationFile: string
  annotationFormat: string
}

export interface DatasetColumn {
  name: string
  label: string
  type: "string" | "number" | "datetime" | "image"
  description: string
  unit?: string
  required?: boolean
}

export interface DatasetTraceability {
  contactOrg: string
  /** Team/department responsible for the dataset. */
  department: string
  /** Named point of contact. */
  contactPerson: string
  /** Contact email. */
  email: string
  dataCollector: string
  environmentConditions: string
  /** Free-form note about collection conditions. */
  additionalInfo: string
}

export interface DatasetValidation {
  semanticIdValid: boolean
  registryStatus: "검증 완료" | "검증 대기" | "검증 실패"
  missingFields: string[]
}

export interface ModelMetric {
  label: string
  value: number
}

export interface TreeNode {
  id: string
  name: string
  stage: string
  framework: Framework
  size: string
  createdAt: string
  runtime: string
  description: string
  children?: TreeNode[]
}

export interface FlowStep {
  id: string
  stage: "Dataset" | "Training" | "Model" | "Deployment"
  title: string
  subtitle: string
  detail: string
  meta: { label: string; value: string }[]
}

export interface Model {
  id: string
  name: string
  task: TaskType
  dataType: Dataset["dataType"]
  industry: Industry
  version: string
  framework: Framework
  accuracy: number
  precision: number
  recall: number
  f1: number
  datasetId: string
  description: string
  input: string
  output: string
  outputFormat: string
  outputItems: string[]
  outputDescription: string
  supportedEnv: string[]
  purpose: string
  image: string
  resultImage: string
  resultType: "Bounding Box" | "OCR" | "Segmentation" | "Before / After"
  tags: string[]
  featured: boolean
  metrics: { name: string; value: number }[]
  inputs: { name: string; type: string; shape: string; description: string }[]
  outputs: { name: string; type: string; shape: string; description: string }[]
  tree: TreeNode
  flow: FlowStep[]
  relatedModelIds: string[]
  deployments: { env: string; date: string; status: string }[]
  versions: VersionEntry[]
  modelFileExtension: string
  storagePath: string
  programLanguage: string
  architecture: string
  hyperparameters: { label: string; value: string }[]
}

export const industries = [
  "자동차",
  "전자·반도체",
  "기계·장비",
  "철강·금속",
  "화학·소재",
  "식품",
  "물류",
  "에너지",
  "기타",
] as const

export const dataTypes = [
  "이미지",
  "시계열",
  "정형 데이터",
  "텍스트",
  "오디오",
  "비디오",
  "멀티모달",
] as const

export const taskTypes = [
  "Classification",
  "Object Detection",
  "Segmentation",
  "Anomaly Detection",
  "Regression",
  "Forecasting",
  "OCR",
  "기타",
] as const

export type Industry = (typeof industries)[number]
export type DataType = (typeof dataTypes)[number]
export type TaskType =
  | "Object Detection"
  | "Segmentation"
  | "Classification"
  | "OCR"
  | "Anomaly Detection"

export const taskThumbnails: Record<TaskType, string> = {
  "Object Detection": "/images/task-thumbnails/object-detection.png",
  Classification: "/images/task-thumbnails/classification.png",
  Segmentation: "/images/task-thumbnails/segmentation.png",
  OCR: "/images/task-thumbnails/ocr.png",
  "Anomaly Detection": "/images/task-thumbnails/anomaly-detection.png",
}

export function getTaskThumbnail(task: TaskType): string {
  return taskThumbnails[task]
}


export interface Dataset {
  id: string
  name: string
  version: string
  description: string
  createdAt: string
  license: string
  /** Total preprocessed sample count (derived = sum of distribution). */
  totalSamples: string
  classCount: number
  labelType: string
  synthetic: boolean
  labeled: boolean
  /** Train / Validation / Test percentage split. */
  splitRatio: [number, number, number]
  tags: string[]
  image: string
  task: TaskType
  industry: Industry
  dataType: DataType
  /** Columns supplied as one inference record when trying the linked model. */
  columns: DatasetColumn[]
  distribution: DatasetClass[]
  storage: DatasetStorage
  directoryStructure: string[]
  preprocessing: string[]
  traceability: DatasetTraceability
  validation: DatasetValidation
  /** Quality of the AAS metadata description (not dataset accuracy). */
  quality: QualityMetric[]
  sampleImages: string[]
  versions: VersionEntry[]
  downloads: number
  stars: number
}

export const datasets: Dataset[] = [
  {
    id: "car-exterior",
    name: "자동차 외관 이미지 데이터셋",
    version: "v2.1",
    description: "완성차 라인에서 수집한 자동차 외관 결함 이미지 데이터셋입니다.",
    createdAt: "2024-02-10",
    license: "Internal",
    totalSamples: "12,480",
    classCount: 8,
    labelType: "Bounding Box / Classification",
    synthetic: false,
    labeled: true,
    splitRatio: [70, 20, 10],
    tags: ["제조", "자동차", "외관검사"],
    image: "/images/datasets/car-dataset.png",
    task: "Object Detection",
    industry: "자동차",
    dataType: "이미지",
    columns: [
      {
        name: "image",
        label: "자동차 외관 이미지",
        type: "image",
        description: "추론할 자동차 외관 이미지 파일을 선택합니다.",
        required: true,
      },
    ],
    distribution: [
      { label: "Scratch", value: 3200 },
      { label: "Dent", value: 2780 },
      { label: "Paint Defect", value: 2450 },
      { label: "Contamination", value: 2100 },
      { label: "Normal", value: 1950 },
      { label: "test1", value: 0 },
      { label: "test2", value: 0 },
      { label: "test3", value: 0 },


    ],
    storage: {
      type: "Object Storage",
      basePath: "/datasets/car-exterior",
      uri: "s3://ai-registry/car-exterior",
      fileType: "PNG",
      annotationFile: "annotations.json",
      annotationFormat: "COCO",
    },
    directoryStructure: ["train/", "validation/", "test/", "annotations/"],
    preprocessing: ["Resize 1280×1280", "RGB normalization", "Data augmentation"],
    traceability: {
      contactOrg: "AI Quality Team",
      department: "AI팀",
      contactPerson: "최현우",
      email: "ai-team@example.com",
      dataCollector: "완성차 라인 카메라",
      environmentConditions: "Factory production line",
      additionalInfo: "외관 검사 공정에서 수집",
    },
    validation: {
      semanticIdValid: true,
      registryStatus: "검증 완료",
      missingFields: [],
    },
    quality: [
      { label: "Completeness", value: 96, description: "필수 메타데이터 완성도" },
      { label: "Consistency", value: 94, description: "메타데이터 일관성" },
    ],
    sampleImages: [],
    versions: [
      { version: "v2.1", date: "2024-02-10", author: "AI팀", changes: "이물질 클래스 추가" },
      { version: "v2.0", date: "2023-12-18", author: "데이터팀", changes: "어노테이션 품질 재검수 및 라벨 정합성 개선" },
      { version: "v1.0", date: "2023-09-05", author: "데이터팀", changes: "초기 데이터셋 릴리스" },
    ],
    downloads: 1248,
    stars: 356,
  },
  {
    id: "document-scan",
    name: "문서 스캔 이미지 데이터셋",
    version: "v1.4",
    description: "작업지시서와 검사 성적서의 OCR 학습용 스캔 이미지 데이터셋입니다.",
    createdAt: "2024-01-20",
    license: "Internal",
    totalSamples: "8,920",
    classCount: 2,
    labelType: "Text Transcription",
    synthetic: false,
    labeled: true,
    splitRatio: [80, 10, 10],
    tags: ["OCR", "문서", "텍스트"],
    image: "/images/datasets/doc-dataset.png",
    task: "OCR",
    industry: "기타",
    dataType: "이미지",
    columns: [
      {
        name: "document_image",
        label: "문서 이미지",
        type: "image",
        description: "OCR을 수행할 문서 이미지 파일을 선택합니다.",
        required: true,
      },
    ],
    distribution: [
      { label: "Printed", value: 6120 },
      { label: "Handwritten", value: 2800 },
    ],
    storage: {
      type: "Object Storage",
      basePath: "/datasets/document-scan",
      uri: "s3://ai-registry/document-scan",
      fileType: "PNG",
      annotationFile: "transcriptions.json",
      annotationFormat: "JSON",
    },
    directoryStructure: ["images/", "annotations/", "splits/"],
    preprocessing: ["Grayscale", "Deskew", "Contrast normalization"],
    traceability: {
      contactOrg: "AI Document Team",
      department: "AI팀",
      contactPerson: "송예린",
      email: "ai-team@example.com",
      dataCollector: "현장 문서 스캐너",
      environmentConditions: "Office and factory documents",
      additionalInfo: "인쇄체 및 손글씨 포함",
    },
    validation: {
      semanticIdValid: true,
      registryStatus: "검증 완료",
      missingFields: [],
    },
    quality: [
      { label: "Completeness", value: 98, description: "필수 메타데이터 완성도" },
      { label: "Consistency", value: 97, description: "메타데이터 일관성" },
    ],
    sampleImages: [],
    versions: [
      { version: "v1.4", date: "2024-01-20", author: "AI팀", changes: "손글씨 데이터 추가" },
      { version: "v1.2", date: "2023-11-08", author: "데이터팀", changes: "노이즈 샘플 제거 및 클래스 균형 조정" },
      { version: "v1.0", date: "2023-08-22", author: "데이터팀", changes: "초기 데이터셋 릴리스" },
    ],
    downloads: 892,
    stars: 210,
  },
  {
    id: "sensor-logs",
    name: "설비 센서 로그 데이터셋",
    version: "v3.0",
    description: "회전 설비의 진동, 온도, 전류 시계열 데이터셋입니다.",
    createdAt: "2024-02-25",
    license: "Internal",
    totalSamples: "2,140",
    classCount: 4,
    labelType: "Sequence Label",
    synthetic: false,
    labeled: true,
    splitRatio: [70, 15, 15],
    tags: ["예지보전", "시계열", "센서"],
    image: "/images/datasets/sensor-dataset.png",
    task: "Anomaly Detection",
    industry: "기계·장비",
    dataType: "시계열",
    columns: [
      {
        name: "TEMP_01",
        label: "설비 온도",
        type: "number",
        description: "현재 측정된 설비의 온도를 입력합니다.",
        unit: "°C",
        required: true,
      },
      {
        name: "VIB_VEL",
        label: "진동 속도",
        type: "number",
        description: "현재 측정된 설비의 진동 속도를 입력합니다.",
        unit: "mm/s",
        required: true,
      },
      {
        name: "MOTOR_A",
        label: "모터 전류",
        type: "number",
        description: "현재 측정된 모터의 전류값을 입력합니다.",
        unit: "A",
        required: true,
      },
    ],
    distribution: [
      { label: "Normal", value: 1280 },
      { label: "Bearing Wear", value: 340 },
      { label: "Misalignment", value: 290 },
      { label: "Overheat", value: 230 },
    ],
    storage: {
      type: "File Storage",
      basePath: "/datasets/sensor-logs",
      uri: "file:///datasets/sensor-logs",
      fileType: "CSV",
      annotationFile: "labels.csv",
      annotationFormat: "CSV",
    },
    directoryStructure: ["train/", "validation/", "test/"],
    preprocessing: ["Resampling", "Windowing 256 steps", "Standardization"],
    traceability: {
      contactOrg: "Predictive Maintenance Team",
      department: "AI팀",
      contactPerson: "임도현",
      email: "ai-team@example.com",
      dataCollector: "회전 설비 센서",
      environmentConditions: "Factory utility equipment",
      additionalInfo: "1초 주기 다채널 센서 데이터",
    },
    validation: {
      semanticIdValid: true,
      registryStatus: "검증 완료",
      missingFields: [],
    },
    quality: [
      { label: "Completeness", value: 93, description: "필수 메타데이터 완성도" },
      { label: "Consistency", value: 92, description: "메타데이터 일관성" },
    ],
    sampleImages: [],
    versions: [
      { version: "v3.0", date: "2024-02-25", author: "AI팀", changes: "전류 채널 추가" },
      { version: "v2.0", date: "2023-12-01", author: "데이터팀", changes: "샘플링 주기 표준화 및 결측 구간 보간" },
      { version: "v1.0", date: "2023-09-14", author: "데이터팀", changes: "초기 데이터셋 릴리스" },
    ],
    downloads: 2140,
    stars: 185,
  },
  {
    id: "pcb-defect",
    name: "PCB 결함 이미지 데이터셋",
    version: "v1.2",
    description: "PCB 현미경 이미지의 픽셀 단위 결함 라벨 데이터셋입니다.",
    createdAt: "2024-02-05",
    license: "Internal",
    totalSamples: "6,300",
    classCount: 6,
    labelType: "Segmentation Mask",
    synthetic: false,
    labeled: true,
    splitRatio: [70, 20, 10],
    tags: ["PCB", "Segmentation", "검사"],
    image: "/images/datasets/pcb-dataset.png",
    task: "Segmentation",
    industry: "전자·반도체",
    dataType: "이미지",
    columns: [
      {
        name: "image",
        label: "PCB 현미경 이미지",
        type: "image",
        description: "분할할 PCB 현미경 이미지 파일을 선택합니다.",
        required: true,
      },
    ],
    distribution: [
      { label: "Solder", value: 1400 },
      { label: "Open Circuit", value: 1100 },
      { label: "Contamination", value: 980 },
      { label: "Missing Part", value: 920 },
      { label: "Bridge", value: 900 },
      { label: "Normal", value: 1000 },
    ],
    storage: {
      type: "Object Storage",
      basePath: "/datasets/pcb-defect",
      uri: "s3://ai-registry/pcb-defect",
      fileType: "PNG",
      annotationFile: "masks/",
      annotationFormat: "Segmentation Mask",
    },
    directoryStructure: ["images/", "masks/", "splits/"],
    preprocessing: ["Resize 1024×1024", "RGB normalization", "Mask validation"],
    traceability: {
      contactOrg: "PCB Inspection Team",
      department: "AI팀",
      contactPerson: "조하늘",
      email: "ai-team@example.com",
      dataCollector: "PCB 현미경 카메라",
      environmentConditions: "SMT inspection process",
      additionalInfo: "픽셀 단위 결함 마스크 포함",
    },
    validation: {
      semanticIdValid: true,
      registryStatus: "검증 완료",
      missingFields: [],
    },
    quality: [
      { label: "Completeness", value: 95, description: "필수 메타데이터 완성도" },
      { label: "Consistency", value: 94, description: "메타데이터 일관성" },
    ],
    sampleImages: [],
    versions: [
      { version: "v1.2", date: "2024-02-05", author: "AI팀", changes: "결함 클래스 확장" },
      { version: "v1.1", date: "2023-11-30", author: "데이터팀", changes: "픽셀 단위 마스크 정밀도 개선" },
      { version: "v1.0", date: "2023-08-30", author: "데이터팀", changes: "초기 데이터셋 릴리스" },
    ],
    downloads: 630,
    stars: 140,
  },
]

export const models: Model[] = [
  {
    id: "yolov8-car-inspection",
    name: "YOLOv8 자동차 외관 검사",
    task: "Object Detection",
    dataType: "이미지",
    industry: "자동차",
    version: "v2.3",
    framework: "PyTorch",
    modelFileExtension: ".pt",
    storagePath: "/models/yolov8-car-inspection/v2.3",
    programLanguage: "Python 3.11",
    architecture: "YOLOv8x",
    hyperparameters: [
      { label: "Learning Rate", value: "0.001" },
      { label: "Batch Size", value: "16" },
      { label: "Epochs", value: "300" },
      { label: "Optimizer", value: "AdamW" },
      { label: "Weight Decay", value: "0.0005" },
    ],
    accuracy: 96.4,
    precision: 95.1,
    recall: 94.3,
    f1: 94.7,
    datasetId: "car-exterior",
    description:
      "완성차 라인에서 촬영된 차량 이미지를 분석해 스크래치, 덴트, 도장 불량 등 외관 결함의 위치와 종류를 실시간으로 검출합니다. 검사 작업자의 육안 검사 부담을 줄이고 누락을 방지합니다.",
    input: "1280×1280 RGB 이미지 (라인 카메라)",
    output: "결함 클래스 + Bounding Box + 신뢰도 점수",
    outputFormat: "JSON",
    outputItems: ["결함 위치", "결함 종류", "신뢰도"],
    outputDescription: "차량 이미지에서 외관 결함의 위치와 종류, 검출 신뢰도를 제공합니다.",
    supportedEnv: ["Factory GPU Server", "NVIDIA Jetson", "ONNX Runtime"],
    purpose: "완성차 외관 결함 자동 검출 및 작업자 알림",
    image: "/images/models/car-inspection.png",
    resultImage: "/images/results/bbox-result.png",
    resultType: "Bounding Box",
    tags: ["제조", "외관검사", "실시간"],
    featured: true,
    metrics: [
      { name: "mAP@50", value: 96 },
      { name: "Precision", value: 95 },
      { name: "Recall", value: 94 },
      { name: "F1", value: 95 },
      { name: "Speed", value: 88 },
    ],
    inputs: [
      { name: "image", type: "float32", shape: "[1, 3, 1280, 1280]", description: "정규화된 RGB 이미지 텐서" },
    ],
    outputs: [
      { name: "boxes", type: "float32", shape: "[N, 4]", description: "결함 영역 좌표 (xyxy)" },
      { name: "scores", type: "float32", shape: "[N]", description: "검출 신뢰도" },
      { name: "classes", type: "int64", shape: "[N]", description: "결함 클래스 인덱스" },
    ],
    tree: {
      id: "base-yolov8",
      name: "YOLOv8x (COCO Pretrained)",
      stage: "Base Model",
      framework: "PyTorch",
      size: "136 MB",
      createdAt: "2023-09-01",
      runtime: "CUDA 12.1",
      description: "COCO 데이터셋으로 사전학습된 YOLOv8x 백본 모델입니다.",
      children: [
        {
          id: "ft-yolov8-car",
          name: "YOLOv8 자동차 외관 (Fine-tuned)",
          stage: "Fine-tuned Model",
          framework: "PyTorch",
          size: "131 MB",
          createdAt: "2024-02-15",
          runtime: "CUDA 12.1",
          description: "자동차 외관 데이터셋으로 파인튜닝한 결함 검출 모델입니다.",
          children: [
            {
              id: "q-yolov8-car",
              name: "YOLOv8 자동차 외관 (INT8 Quantized)",
              stage: "Quantized Model",
              framework: "ONNX",
              size: "34 MB",
              createdAt: "2024-03-02",
              runtime: "ONNX Runtime",
              description: "INT8 양자화로 추론 속도를 3배 높인 경량 모델입니다.",
              children: [
                {
                  id: "edge-yolov8-car",
                  name: "YOLOv8 자동차 외관 (Edge / Jetson)",
                  stage: "Edge Model",
                  framework: "TensorRT",
                  size: "29 MB",
                  createdAt: "2024-03-20",
                  runtime: "Jetson Orin / TensorRT",
                  description: "Jetson Orin 엣지 디바이스 배포용 TensorRT 최적화 모델입니다.",
                },
              ],
            },
          ],
        },
      ],
    },
    flow: [
      {
        id: "f1",
        stage: "Dataset",
        title: "자동차 외관 이미지",
        subtitle: "v2.1 · 12,480장",
        detail: "완성차 라인 카메라로 수집한 외관 이미지에 5종 결함을 라벨링한 데이터셋입니다.",
        meta: [
          { label: "클래스", value: "5종" },
          { label: "이미지", value: "12,480" },
          { label: "라이선스", value: "Internal" },
        ],
      },
      {
        id: "f2",
        stage: "Training",
        title: "YOLOv8 파인튜닝",
        subtitle: "300 epochs · A100 ×4",
        detail: "COCO 사전학습 가중치에서 출발해 300 에폭 동안 파인튜닝을 수행했습니다.",
        meta: [
          { label: "Epochs", value: "300" },
          { label: "GPU", value: "A100 ×4" },
          { label: "소요", value: "18시간" },
        ],
      },
      {
        id: "f3",
        stage: "Model",
        title: "YOLOv8 Detector v2.3",
        subtitle: "mAP@50 96.4%",
        detail: "검출 정확도 mAP@50 96.4%를 달성한 최종 검출 모델입니다.",
        meta: [
          { label: "mAP@50", value: "96.4%" },
          { label: "크기", value: "131 MB" },
          { label: "추론", value: "12ms" },
        ],
      },
      {
        id: "f4",
        stage: "Deployment",
        title: "Factory GPU Server",
        subtitle: "1공장 도장 라인",
        detail: "1공장 도장 검사 라인의 GPU 서버에 배포되어 실시간 검사를 수행 중입니다.",
        meta: [
          { label: "환경", value: "GPU Server" },
          { label: "처리량", value: "60 FPS" },
          { label: "가동", value: "운영중" },
        ],
      },
    ],
    relatedModelIds: ["surface-defect-classifier", "safety-gear-detector"],
    deployments: [
      { env: "1공장 도장 라인 (GPU Server)", date: "2024-03-22", status: "운영중" },
      { env: "2공장 조립 라인 (Jetson)", date: "2024-04-05", status: "운영중" },
      { env: "품질 검증 환경 (Staging)", date: "2024-03-10", status: "종료" },
    ],
    versions: [
      { version: "v2.3", date: "2024-03-20", author: "AI팀 최현우", changes: "이물질 클래스 추가, mAP 1.2%p 향상" },
      { version: "v2.0", date: "2024-02-15", author: "AI팀 최현우", changes: "YOLOv8x 백본으로 교체" },
      { version: "v1.0", date: "2023-12-01", author: "AI팀 강다은", changes: "초기 검출 모델 배포" },
    ],
  },
  {
    id: "ocr-text-recognition",
    name: "OCR 문자 인식 모델",
    task: "OCR",
    dataType: "이미지",
    industry: "기타",
    version: "v1.6",
    framework: "PyTorch",

    modelFileExtension: ".pt",
    storagePath: "/models/ocr/v1.6",
    programLanguage: "Python 3.11",
    architecture: "CNN + Transformer",
    hyperparameters: [
      { label: "Learning Rate", value: "0.001" },
      { label: "Batch Size", value: "32" },
      { label: "Epochs", value: "120" },
      { label: "Optimizer", value: "AdamW" },
      { label: "Weight Decay", value: "0.0001" },
    ],

    accuracy: 98.1,
    precision: 97.8,
    recall: 97.2,
    f1: 97.5,
    datasetId: "document-scan",
    description:
      "작업지시서, 검사 성적서, 라벨 스티커의 문자를 인식해 디지털 텍스트로 변환합니다. 인쇄체와 손글씨를 모두 지원해 현장 문서 자동 입력을 돕습니다.",
    input: "가변 해상도 스캔 이미지 (그레이스케일)",
    output: "인식 텍스트 + 문자 단위 박스 + 신뢰도",
    outputFormat: "JSON",
    outputItems: ["텍스트", "문자 위치", "신뢰도"],
    outputDescription: "문서 이미지에서 문자를 인식하고 문자 위치와 인식 신뢰도를 제공합니다.",
    supportedEnv: ["Factory GPU Server", "CPU (ONNX)", "Web API"],
    purpose: "현장 문서 텍스트 자동 디지털화",
    image: "/images/models/ocr.png",
    resultImage: "/images/results/ocr-result.png",
    resultType: "OCR",
    tags: ["OCR", "문서", "텍스트"],
    featured: true,
    metrics: [
      { name: "정확도", value: 98 },
      { name: "Precision", value: 98 },
      { name: "Recall", value: 97 },
      { name: "F1", value: 98 },
      { name: "Speed", value: 82 },
    ],
    inputs: [
      { name: "image", type: "float32", shape: "[1, 1, H, W]", description: "그레이스케일 스캔 이미지" },
    ],
    outputs: [
      { name: "text", type: "string", shape: "[L]", description: "인식된 텍스트 시퀀스" },
      { name: "boxes", type: "float32", shape: "[L, 4]", description: "문자 단위 박스" },
      { name: "confidence", type: "float32", shape: "[L]", description: "문자별 신뢰도" },
    ],
    tree: {
      id: "base-trocr",
      name: "TrOCR Base (인쇄체 사전학습)",
      stage: "Base Model",
      framework: "PyTorch",
      size: "334 MB",
      createdAt: "2023-08-10",
      runtime: "CUDA 12.1",
      description: "대규모 인쇄체 코퍼스로 사전학습된 Transformer OCR 모델입니다.",
      children: [
        {
          id: "ft-ocr-field",
          name: "OCR 현장문서 (Fine-tuned)",
          stage: "Fine-tuned Model",
          framework: "PyTorch",
          size: "330 MB",
          createdAt: "2024-01-25",
          runtime: "CUDA 12.1",
          description: "현장 문서 데이터로 파인튜닝하여 손글씨 인식을 강화했습니다.",
          children: [
            {
              id: "q-ocr-field",
              name: "OCR 현장문서 (ONNX)",
              stage: "Quantized Model",
              framework: "ONNX",
              size: "92 MB",
              createdAt: "2024-02-12",
              runtime: "ONNX Runtime (CPU)",
              description: "CPU 추론을 위한 ONNX 변환 및 경량화 모델입니다.",
            },
          ],
        },
      ],
    },
    flow: [
      {
        id: "f1",
        stage: "Dataset",
        title: "문서 스캔 이미지",
        subtitle: "v1.4 · 8,920장",
        detail: "현장 작업 문서를 스캔하고 텍스트를 전사한 OCR 데이터셋입니다.",
        meta: [
          { label: "샘플", value: "8,920" },
          { label: "유형", value: "인쇄/손글씨" },
          { label: "라이선스", value: "Internal" },
        ],
      },
      {
        id: "f2",
        stage: "Training",
        title: "TrOCR 파인튜닝",
        subtitle: "120 epochs · A100 ×2",
        detail: "인쇄체 사전학습 모델에 손글씨 데이터를 추가 학습했습니다.",
        meta: [
          { label: "Epochs", value: "120" },
          { label: "GPU", value: "A100 ×2" },
          { label: "소요", value: "9시간" },
        ],
      },
      {
        id: "f3",
        stage: "Model",
        title: "OCR 문자 인식 v1.6",
        subtitle: "정확도 98.1%",
        detail: "문자 인식 정확도 98.1%의 현장 특화 OCR 모델입니다.",
        meta: [
          { label: "정확도", value: "98.1%" },
          { label: "크기", value: "330 MB" },
          { label: "추론", value: "45ms" },
        ],
      },
      {
        id: "f4",
        stage: "Deployment",
        title: "Web API",
        subtitle: "문서 자동입력 서비스",
        detail: "사내 문서 자동입력 시스템의 Web API로 연동되어 운영 중입니다.",
        meta: [
          { label: "환경", value: "Web API" },
          { label: "처리량", value: "20 req/s" },
          { label: "가동", value: "운영중" },
        ],
      },
    ],
    relatedModelIds: ["yolov8-car-inspection"],
    deployments: [
      { env: "문서 자동입력 API (GPU Server)", date: "2024-02-18", status: "운영중" },
      { env: "모바일 스캔 앱 (CPU/ONNX)", date: "2024-03-01", status: "운영중" },
    ],
    versions: [
      { version: "v1.6", date: "2024-02-12", author: "AI팀 송예린", changes: "손글씨 정확도 2.4%p 향상" },
      { version: "v1.0", date: "2023-12-20", author: "AI팀 송예린", changes: "초기 OCR 모델 배포" },
    ],
  },
  {
    id: "predictive-maintenance",
    name: "예지보전 모델",
    task: "Anomaly Detection",
    dataType: "시계열",
    industry: "기계·장비",
    version: "v3.1",
    framework: "TensorFlow",
    modelFileExtension: ".h5",
    storagePath: "/models/predictive-maintenance/v3.1",
    programLanguage: "Python 3.11",
    architecture: "LSTM Autoencoder + Classification Head",
    hyperparameters: [
      { label: "Learning Rate", value: "0.001" },
      { label: "Batch Size", value: "64" },
      { label: "Epochs", value: "200" },
      { label: "Optimizer", value: "Adam" },
      { label: "Sequence Length", value: "256" },
    ],

    accuracy: 93.2,
    precision: 91.5,
    recall: 89.8,
    f1: 90.6,
    datasetId: "sensor-logs",
    description:
      "회전 설비의 진동·온도·전류 시계열을 분석해 고장 징후를 사전에 감지합니다. 베어링 마모, 축 정렬 불량 등 이상 유형을 분류하여 정비 시점을 예측합니다.",
    input: "다채널 시계열 윈도우 (진동/온도/전류)",
    output: "이상 점수 + 이상 유형 + 잔여 수명 추정",
    outputFormat: "JSON",
    outputItems: ["이상 점수", "이상 유형", "잔여 수명"],
    outputDescription: "센서 데이터에서 이상 여부와 고장 유형, 예상 잔여 수명을 제공합니다.",
    supportedEnv: ["Factory Edge Gateway", "Cloud Inference", "On-Prem Server"],
    purpose: "설비 고장 사전 예측 및 정비 계획 최적화",
    image: "/images/models/predictive.png",
    resultImage: "/images/results/timeseries-result.png",
    resultType: "Before / After",
    tags: ["예지보전", "시계열", "설비"],
    featured: true,
    metrics: [
      { name: "정확도", value: 93 },
      { name: "Precision", value: 92 },
      { name: "Recall", value: 90 },
      { name: "F1", value: 91 },
      { name: "Speed", value: 95 },
    ],
    inputs: [
      { name: "window", type: "float32", shape: "[1, 256, 3]", description: "256 스텝 × 3채널 시계열" },
    ],
    outputs: [
      { name: "anomaly_score", type: "float32", shape: "[1]", description: "이상 점수 (0~1)" },
      { name: "fault_type", type: "int64", shape: "[1]", description: "이상 유형 인덱스" },
      { name: "rul_days", type: "float32", shape: "[1]", description: "추정 잔여 수명(일)" },
    ],
    tree: {
      id: "base-lstm",
      name: "LSTM Autoencoder (Base)",
      stage: "Base Model",
      framework: "TensorFlow",
      size: "48 MB",
      createdAt: "2023-07-15",
      runtime: "TF 2.15",
      description: "정상 데이터로 학습된 시계열 재구성 기반 이상탐지 베이스 모델입니다.",
      children: [
        {
          id: "ft-pdm",
          name: "예지보전 분류 (Fine-tuned)",
          stage: "Fine-tuned Model",
          framework: "TensorFlow",
          size: "52 MB",
          createdAt: "2024-02-28",
          runtime: "TF 2.15",
          description: "이상 유형 분류 헤드를 추가해 학습한 모델입니다.",
          children: [
            {
              id: "edge-pdm",
              name: "예지보전 (Edge / TFLite)",
              stage: "Edge Model",
              framework: "ONNX",
              size: "11 MB",
              createdAt: "2024-03-15",
              runtime: "TFLite / Edge Gateway",
              description: "엣지 게이트웨이 배포용 TFLite 경량 모델입니다.",
            },
          ],
        },
      ],
    },
    flow: [
      {
        id: "f1",
        stage: "Dataset",
        title: "설비 센서 로그",
        subtitle: "v3.0 · 2,140 시퀀스",
        detail: "회전 설비의 다채널 센서 시계열에 정상/이상 라벨을 부여한 데이터셋입니다.",
        meta: [
          { label: "채널", value: "3종" },
          { label: "시퀀스", value: "2,140" },
          { label: "라이선스", value: "Internal" },
        ],
      },
      {
        id: "f2",
        stage: "Training",
        title: "LSTM-AE + 분류 학습",
        subtitle: "200 epochs · V100",
        detail: "재구성 손실과 분류 손실을 함께 최적화하여 이상 유형을 학습했습니다.",
        meta: [
          { label: "Epochs", value: "200" },
          { label: "GPU", value: "V100" },
          { label: "소요", value: "6시간" },
        ],
      },
      {
        id: "f3",
        stage: "Model",
        title: "예지보전 모델 v3.1",
        subtitle: "정확도 93.2%",
        detail: "이상 분류 정확도 93.2%, 잔여 수명 추���을 제공하는 모델입니다.",
        meta: [
          { label: "정확도", value: "93.2%" },
          { label: "크기", value: "52 MB" },
          { label: "추론", value: "3ms" },
        ],
      },
      {
        id: "f4",
        stage: "Deployment",
        title: "Factory Edge Gateway",
        subtitle: "유틸리티동 회전설비",
        detail: "유틸리티동 회전 설비의 엣지 게이트웨이에 배포되어 상시 모니터링 중입니다.",
        meta: [
          { label: "환경", value: "Edge Gateway" },
          { label: "주기", value: "1초" },
          { label: "가동", value: "운영중" },
        ],
      },
    ],
    relatedModelIds: ["pcb-defect-segmentation"],
    deployments: [
      { env: "유틸리티동 엣지 게이트웨이", date: "2024-03-18", status: "운영중" },
      { env: "통합 관제 클라우드", date: "2024-03-25", status: "운영중" },
    ],
    versions: [
      { version: "v3.1", date: "2024-03-15", author: "AI팀 임도현", changes: "잔여 수명 추정 헤드 추가" },
      { version: "v3.0", date: "2024-02-28", author: "AI팀 임도현", changes: "이상 유형 4종 분류 지원" },
      { version: "v2.0", date: "2023-12-10", author: "AI팀 임도현", changes: "전류 채널 반영" },
    ],
  },
  {
    id: "pcb-defect-segmentation",
    name: "PCB 결함 세그멘테이션",
    task: "Segmentation",
    dataType: "이미지",
    industry: "전자·반도체",
    version: "v1.5",
    framework: "PyTorch",
    modelFileExtension: ".pt",
    storagePath: "/models/pcb-defect-segmentation/v1.5",
    programLanguage: "Python 3.11",
    architecture: "SegFormer-B3",
    hyperparameters: [
      { label: "Learning Rate", value: "0.00006" },
      { label: "Batch Size", value: "8" },
      { label: "Epochs", value: "160" },
      { label: "Optimizer", value: "AdamW" },
      { label: "Input Size", value: "1024 × 1024" },
    ],
    accuracy: 95.0,
    precision: 93.7,
    recall: 92.4,
    f1: 93.0,
    datasetId: "pcb-defect",
    description:
      "PCB 현미경 이미지에서 납땜 불량·단선·이물 등 미세 결함 영역을 픽셀 단위로 분할합니다. 결함의 위치와 면적을 정량화해 품질 판정을 자동화합니다.",
    input: "1024×1024 RGB 현미경 이미지",
    output: "결함 영역 세그멘테이션 마스크 + 클래스",
    outputFormat: "Mask + JSON",
    outputItems: ["결함 영역", "결함 종류", "결함 면적"],
    outputDescription: "PCB 이미지에서 결함 영역을 분할하고 결함 종류와 면적 정보를 제공합니다.",
    supportedEnv: ["Factory GPU Server", "Inspection Workstation"],
    purpose: "PCB 미세 결함 영역 자동 분할 및 정량화",
    image: "/images/models/pcb-defect.png",
    resultImage: "/images/results/segmentation-result.png",
    resultType: "Segmentation",
    tags: ["PCB", "Segmentation", "검사"],
    featured: false,
    metrics: [
      { name: "mIoU", value: 91 },
      { name: "Precision", value: 94 },
      { name: "Recall", value: 92 },
      { name: "F1", value: 93 },
      { name: "Speed", value: 70 },
    ],
    inputs: [
      { name: "image", type: "float32", shape: "[1, 3, 1024, 1024]", description: "정규화된 RGB 이미지" },
    ],
    outputs: [
      { name: "mask", type: "int64", shape: "[1, 1024, 1024]", description: "픽셀별 클래스 마스크" },
      { name: "class_area", type: "float32", shape: "[C]", description: "클래스별 결함 면적" },
    ],
    tree: {
      id: "base-segformer",
      name: "SegFormer-B3 (ADE20K)",
      stage: "Base Model",
      framework: "PyTorch",
      size: "186 MB",
      createdAt: "2023-09-20",
      runtime: "CUDA 12.1",
      description: "ADE20K로 사전학습된 SegFormer 세그멘테이션 백본입니다.",
      children: [
        {
          id: "ft-pcb",
          name: "PCB 결함 세그멘테이션 (Fine-tuned)",
          stage: "Fine-tuned Model",
          framework: "PyTorch",
          size: "182 MB",
          createdAt: "2024-03-05",
          runtime: "CUDA 12.1",
          description: "PCB 결함 데이터로 파인튜닝한 세그멘테이션 모델입니다.",
          children: [
            {
              id: "q-pcb",
              name: "PCB 결함 (ONNX)",
              stage: "Quantized Model",
              framework: "ONNX",
              size: "64 MB",
              createdAt: "2024-03-22",
              runtime: "ONNX Runtime",
              description: "검사 워크스테이션 배포용 ONNX 모델입니다.",
            },
          ],
        },
      ],
    },
    flow: [
      {
        id: "f1",
        stage: "Dataset",
        title: "PCB 결함 이미지",
        subtitle: "v1.2 · 6,300장",
        detail: "PCB 현미경 이미지에 6종 결함을 픽셀 단위로 라벨링한 데이터셋입니다.",
        meta: [
          { label: "클래스", value: "6종" },
          { label: "이미지", value: "6,300" },
          { label: "라이선스", value: "Internal" },
        ],
      },
      {
        id: "f2",
        stage: "Training",
        title: "SegFormer 파인튜닝",
        subtitle: "160 epochs · A100 ×2",
        detail: "ADE20K 사전학습 가중치에서 PCB 결함 마스크를 학습했습니다.",
        meta: [
          { label: "Epochs", value: "160" },
          { label: "GPU", value: "A100 ×2" },
          { label: "소요", value: "11시간" },
        ],
      },
      {
        id: "f3",
        stage: "Model",
        title: "PCB 세그멘테이션 v1.5",
        subtitle: "mIoU 91%",
        detail: "픽셀 단위 분할 정확도 mIoU 91%를 달성한 모델입니다.",
        meta: [
          { label: "mIoU", value: "91%" },
          { label: "크기", value: "182 MB" },
          { label: "추론", value: "38ms" },
        ],
      },
      {
        id: "f4",
        stage: "Deployment",
        title: "Inspection Workstation",
        subtitle: "SMT 검사 공정",
        detail: "SMT 검사 공정의 워크스테이션에 배포되어 자동 판정에 활용됩니다.",
        meta: [
          { label: "환경", value: "Workstation" },
          { label: "처리량", value: "25 FPS" },
          { label: "가동", value: "운영중" },
        ],
      },
    ],
    relatedModelIds: ["surface-defect-classifier", "predictive-maintenance"],
    deployments: [
      { env: "SMT 검사 워크스테이션", date: "2024-03-24", status: "운영중" },
    ],
    versions: [
      { version: "v1.5", date: "2024-03-22", author: "AI팀 조하늘", changes: "부품누락 클래스 지원" },
      { version: "v1.0", date: "2024-02-10", author: "AI팀 조하늘", changes: "초기 세그멘테이션 모델 배포" },
    ],
  },
  {
    id: "surface-defect-classifier",
    name: "표면 결함 분류 모델",
    task: "Classification",
    dataType: "이미지",
    industry: "기계·장비",
    version: "v2.0",
    framework: "PyTorch",
    modelFileExtension: ".pt",
    storagePath: "/models/surface-defect-classifier/v2.0",
    programLanguage: "Python 3.11",
    architecture: "EfficientNet-B2",
    hyperparameters: [
      { label: "Learning Rate", value: "0.001" },
      { label: "Batch Size", value: "32" },
      { label: "Epochs", value: "100" },
      { label: "Optimizer", value: "AdamW" },
      { label: "Weight Decay", value: "0.0001" },
    ],
    accuracy: 97.3,
    precision: 96.8,
    recall: 96.1,
    f1: 96.4,
    datasetId: "car-exterior",
    description:
      "금속 표면 이미지를 입력받아 결함 유형을 분류합니다. 경량 모델로 빠른 판정이 가능해 고속 라인의 1차 선별에 적합합니다.",
    input: "384×384 RGB 표면 이미지",
    output: "결함 클래스 + 클래스별 확률",
    outputFormat: "JSON",
    outputItems: ["결함 종류", "클래스별 확률"],
    outputDescription: "입력 이미지의 표면 결함 종류와 각 클래스별 예측 확률을 제공합니다.",
    supportedEnv: ["NVIDIA Jetson", "ONNX Runtime", "Factory GPU Server"],
    purpose: "표면 결함 유형 고속 분류 및 1차 선별",
    image: "/images/models/surface-defect.png",
    resultImage: "/images/results/bbox-result.png",
    resultType: "Before / After",
    tags: ["분류", "표면", "고속"],
    featured: false,
    metrics: [
      { name: "정확도", value: 97 },
      { name: "Precision", value: 97 },
      { name: "Recall", value: 96 },
      { name: "F1", value: 96 },
      { name: "Speed", value: 98 },
    ],
    inputs: [
      { name: "image", type: "float32", shape: "[1, 3, 384, 384]", description: "정규화된 RGB 이미지" },
    ],
    outputs: [
      { name: "logits", type: "float32", shape: "[5]", description: "클래스별 로짓" },
      { name: "probs", type: "float32", shape: "[5]", description: "클래스별 확률" },
    ],
    tree: {
      id: "base-effnet",
      name: "EfficientNet-B2 (ImageNet)",
      stage: "Base Model",
      framework: "PyTorch",
      size: "36 MB",
      createdAt: "2023-08-01",
      runtime: "CUDA 12.1",
      description: "ImageNet 사전학습 EfficientNet-B2 분류 백본입니다.",
      children: [
        {
          id: "ft-surface",
          name: "표면 결함 분류 (Fine-tuned)",
          stage: "Fine-tuned Model",
          framework: "PyTorch",
          size: "35 MB",
          createdAt: "2024-02-20",
          runtime: "CUDA 12.1",
          description: "표면 결함 데이터로 파인튜닝한 분류 모델입니다.",
          children: [
            {
              id: "edge-surface",
              name: "표면 결함 분류 (Edge)",
              stage: "Edge Model",
              framework: "TensorRT",
              size: "9 MB",
              createdAt: "2024-03-10",
              runtime: "Jetson / TensorRT",
              description: "고속 라인 엣지 디바이스용 TensorRT 모델입니다.",
            },
          ],
        },
      ],
    },
    flow: [
      {
        id: "f1",
        stage: "Dataset",
        title: "자동차 외관 이미지",
        subtitle: "v2.1 · 12,480장",
        detail: "외관 결함 데이터셋에서 분류 라벨을 추출해 활용했습니다.",
        meta: [
          { label: "클래스", value: "5종" },
          { label: "이미지", value: "12,480" },
          { label: "라이선스", value: "Internal" },
        ],
      },
      {
        id: "f2",
        stage: "Training",
        title: "EfficientNet 파인튜닝",
        subtitle: "100 epochs · A100",
        detail: "ImageNet 가중치에서 표면 결함 분류를 학습했습니다.",
        meta: [
          { label: "Epochs", value: "100" },
          { label: "GPU", value: "A100" },
          { label: "소요", value: "4시간" },
        ],
      },
      {
        id: "f3",
        stage: "Model",
        title: "표면 결함 분류 v2.0",
        subtitle: "정확도 97.3%",
        detail: "고속 분류 정확도 97.3%를 달성한 경량 모델입니다.",
        meta: [
          { label: "정확도", value: "97.3%" },
          { label: "크기", value: "35 MB" },
          { label: "추론", value: "4ms" },
        ],
      },
      {
        id: "f4",
        stage: "Deployment",
        title: "NVIDIA Jetson",
        subtitle: "고속 선별 라인",
        detail: "고속 선별 라인의 Jetson 디바이스에 배포되어 1차 선별을 담당합니다.",
        meta: [
          { label: "환경", value: "Jetson" },
          { label: "처리량", value: "120 FPS" },
          { label: "가동", value: "운영중" },
        ],
      },
    ],
    relatedModelIds: ["yolov8-car-inspection", "pcb-defect-segmentation"],
    deployments: [
      { env: "고속 선별 라인 (Jetson)", date: "2024-03-12", status: "운영중" },
    ],
    versions: [
      { version: "v2.0", date: "2024-03-10", author: "AI팀 백서준", changes: "EfficientNet-B2로 백본 교체" },
      { version: "v1.0", date: "2024-01-15", author: "AI팀 백서준", changes: "초기 분류 모델 배포" },
    ],
  }
]

export const allTags: string[] = Array.from(
  new Set(models.flatMap((m) => m.tags)),
).sort()

export function getModel(id: string): Model | undefined {
  return models.find((m) => m.id === id)
}

export function getDataset(id: string): Dataset | undefined {
  return datasets.find((d) => d.id === id)
}

export function getModelsByDataset(datasetId: string): Model[] {
  return models.filter((m) => m.datasetId === datasetId)
}

export function getRelatedModels(model: Model): Model[] {
  return model.relatedModelIds
    .map((id) => getModel(id))
    .filter((m): m is Model => Boolean(m))
}

/* --------------------------------------------------------------------------
 * AI Asset Pairs — a 1:1 link between one AI Dataset and one AI Model.
 * Every model already references its training dataset via `datasetId`,
 * so each valid (dataset, model) reference forms one standardized pair.
 * ------------------------------------------------------------------------ */

export type PairAccess = "Public" | "Restricted" | "Private"
export type PairValidation = "Validated" | "Warnings" | "Unvalidated"

export interface AssetPair {
  id: string
  version: string
  title: string
  description: string
  dataset: Dataset
  model: Model
  task: TaskType
  framework: Framework
  license: string
  access: PairAccess
  validation: PairValidation
  downloadable: boolean
  /** Primary headline metric for the pair (task-dependent). */
  metric: { label: string; value: string }
  downloads: number
  stars: number
  tags: string[]
}

function accessFromLicense(license: string): PairAccess {
  if (/NC|Internal|Proprietary/i.test(license)) return "Restricted"
  return "Public"
}

function validationFromDataset(d: Dataset): PairValidation {
  if (d.validation.registryStatus === "검증 완료") return "Validated"
  if (d.validation.registryStatus === "검증 실패") return "Unvalidated"
  return "Warnings"
}

function primaryMetric(model: Model): { label: string; value: string } {
  switch (model.task) {
    case "Anomaly Detection":
      return { label: "ROC-AUC", value: (0.9 + model.f1 / 1000).toFixed(3) }
    case "Segmentation":
      return { label: "mIoU", value: (model.accuracy / 100).toFixed(3) }
    case "OCR":
      return { label: "CER", value: (1 - model.accuracy / 100).toFixed(3) }
    case "Classification":
      return { label: "Top-1", value: (model.accuracy / 100).toFixed(3) }
    default:
      return { label: "mAP@50", value: (model.accuracy / 100).toFixed(3) }
  }
}

export const assetPairs: AssetPair[] = models
  .map((model, i): AssetPair | null => {
    const dataset = getDataset(model.datasetId)
    if (!dataset) return null
    const access = accessFromLicense(dataset.license)
    const validation = validationFromDataset(dataset)
    return {
      id: `${model.id}--${dataset.id}`,
      version: model.version,
      title: `${dataset.name} → ${model.name}`,
      description: model.description,
      dataset,
      model,
      task: model.task,
      framework: model.framework,
      license: dataset.license,
      access,
      validation,
      downloadable: access !== "Private" && validation !== "Unvalidated",
      metric: primaryMetric(model),
      downloads: 2400 + ((i * 3137) % 12000),
      stars: 120 + ((i * 977) % 780),
      tags: Array.from(new Set([...model.tags, ...dataset.tags])),
    }
  })
  .filter((p): p is AssetPair => p !== null)

export function getAssetPair(id: string): AssetPair | undefined {
  return assetPairs.find((p) => p.id === id)
}

export const frameworks: Framework[] = Array.from(
  new Set(models.map((m) => m.framework)),
)

export const licenses: string[] = Array.from(
  new Set(datasets.map((d) => d.license)),
)

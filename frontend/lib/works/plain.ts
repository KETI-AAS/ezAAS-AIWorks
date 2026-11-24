import type { Model, TaskType } from "@/lib/registry-data"

/** Practical, plain-Korean framing for each AI task. */
export const USE_CASES: {
  task: TaskType
  problem: string
  question: string
  inputKind: string
  outputKind: string
  thumbnail: string
}[] = [
  {
    task: "Object Detection",
    problem: "외관 결함 위치 찾기",
    question: "제품 사진에서 흠집·찍힘이 어디 있는지 알고 싶어요",
    inputKind: "제품 사진",
    outputKind: "결함 위치 표시 + 종류",
    thumbnail: "/images/task-thumbnails/object-detection.png",
  },
  {
    task: "Segmentation",
    problem: "결함 영역 정밀하게 나누기",
    question: "결함이 얼마나 넓게 퍼졌는지 면적까지 보고 싶어요",
    inputKind: "기판·표면 사진",
    outputKind: "결함 영역 마스크",
    thumbnail: "/images/task-thumbnails/segmentation.png",
  },
  {
    task: "Classification",
    problem: "결함 종류 빠르게 분류",
    question: "불량품이 어떤 유형인지 자동으로 나누고 싶어요",
    inputKind: "표면 사진",
    outputKind: "결함 유형 + 확신 정도",
    thumbnail: "/images/task-thumbnails/classification.png",
  },
  {
    task: "Anomaly Detection",
    problem: "설비 이상 미리 알아채기",
    question: "설비가 고장 나기 전에 이상 신호를 잡고 싶어요",
    inputKind: "센서 기록 (진동·온도)",
    outputKind: "이상 점수 + 시점",
    thumbnail: "/images/task-thumbnails/anomaly-detection.png",
  },
  {
    task: "OCR",
    problem: "문서·라벨 글자 읽기",
    question: "작업 지시서나 라벨의 글자를 자동으로 옮기고 싶어요",
    inputKind: "문서 스캔 이미지",
    outputKind: "읽어 낸 텍스트",
    thumbnail: "/images/task-thumbnails/ocr.png",
  },
]

export function useCaseOf(task: TaskType) {
  return USE_CASES.find((u) => u.task === task) ?? USE_CASES[0]
}

export const TASK_KO: Record<TaskType, string> = {
  "Object Detection": "객체 검출",
  Segmentation: "영역 분할",
  Classification: "분류",
  "Anomaly Detection": "이상 탐지",
  OCR: "문자 인식",
}

/** Example result shown after a (simulated) trial run. Always labeled as an example. */
export type DemoFinding = { label: string; where: string; score: number }

export function demoResult(model: Model): { headline: string; summary: string; findings: DemoFinding[] } {
  switch (model.task) {
    case "Object Detection":
      return {
        headline: "결함으로 보이는 곳 3군데를 찾았어요",
        summary: "사진 위 상자가 AI가 결함이라고 판단한 위치입니다. 숫자는 AI가 얼마나 확신하는지를 나타내요.",
        findings: [
          { label: "스크래치", where: "앞문 하단", score: 0.94 },
          { label: "덴트(찍힘)", where: "뒤 펜더", score: 0.88 },
          { label: "도장 불량", where: "보닛 좌측", score: 0.71 },
        ],
      }
    case "Segmentation":
      return {
        headline: "결함 영역 2곳을 나눠 표시했어요",
        summary: "색으로 칠해진 부분이 AI가 결함으로 판단한 영역입니다.",
        findings: [
          { label: "브리지(납 연결)", where: "U7 칩 하단", score: 0.91 },
          { label: "단선", where: "우측 배선", score: 0.79 },
        ],
      }
    case "Classification":
      return {
        headline: "가장 가까운 유형은 '스크래치'예요",
        summary: "AI가 고른 상위 유형과 각각의 확신 정도입니다.",
        findings: [
          { label: "스크래치", where: "1순위", score: 0.86 },
          { label: "오염", where: "2순위", score: 0.09 },
          { label: "정상", where: "3순위", score: 0.05 },
        ],
      }
    case "Anomaly Detection":
      return {
        headline: "최근 구간에서 이상 신호 1건이 보여요",
        summary: "그래프에서 붉게 표시된 구간이 평소 패턴과 다르게 움직인 시점입니다.",
        findings: [{ label: "진동 급증", where: "09:12:08 전후", score: 0.82 }],
      }
    case "OCR":
      return {
        headline: "문서에서 글자 14줄을 읽었어요",
        summary: "읽어 낸 문장과 위치입니다. 흐린 글자는 확신 정도가 낮게 나와요.",
        findings: [
          { label: "작업지시서 No. 2024-0528", where: "상단", score: 0.97 },
          { label: "품번 AX-3012 / 수량 240", where: "중단", score: 0.93 },
          { label: "검사자 서명", where: "하단", score: 0.61 },
        ],
      }
  }
}

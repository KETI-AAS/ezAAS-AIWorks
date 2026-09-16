import type { Metadata } from "next"

import { TrainingLanding } from "@/components/training/training-landing"

export const metadata: Metadata = {
  title: "AI Training — AI Model Registry",
  description:
    "제조 현장의 레거시 데이터를 AAS 기반 의미 연결과 자동 전처리를 통해 AI 모델에 학습시키는 통합 워크플로입니다.",
}

export default function TrainingPage() {
  return <TrainingLanding />
}

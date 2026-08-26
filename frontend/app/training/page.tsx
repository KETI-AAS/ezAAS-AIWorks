import type { Metadata } from "next"

import { TrainingWorkbench } from "@/components/training/training-workbench"

export const metadata: Metadata = {
  title: "AI Training — AI Model Registry",
  description:
    "등록된 AI 모델을 사용하여 내 데이터를 추가 학습(Fine-tuning)하고 새로운 모델을 생성하세요.",
}

export default function TrainingPage() {
  return <TrainingWorkbench />
}

import type { Metadata } from "next"
import { Suspense } from "react"

import { Training } from "@/components/works/training"

export const metadata: Metadata = {
  title: "내 데이터로 학습 · AI Works",
  description: "기존 AI를 바탕으로 우리 라인 데이터를 더 학습시켜 새 버전을 만들어 보세요.",
}

export default function TrainingPage() {
  return (
    <Suspense>
      <Training />
    </Suspense>
  )
}

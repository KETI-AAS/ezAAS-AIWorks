import type { Metadata } from "next"

import { Explore } from "@/components/works/explore"
import { parseTask } from "@/lib/works/parse-task"

export const metadata: Metadata = {
  title: "모델 + 데이터 짝 · AI Works",
  description: "각 AI 모델이 어떤 데이터로 학습했는지 짝으로 확인하세요.",
}

export default async function PairsPage({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const { task } = await searchParams
  return <Explore mode="pairs" initialTask={parseTask(task)} />
}

import type { Metadata } from "next"

import { Explore } from "@/components/works/explore"
import { parseTask } from "@/lib/works/parse-task"

export const metadata: Metadata = {
  title: "학습 데이터 · AI Works",
  description: "AI 모델이 학습한 데이터셋과 그 데이터로 배운 AI를 함께 확인하세요.",
}

export default async function DatasetsPage({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const { task } = await searchParams
  return <Explore mode="datasets" initialTask={parseTask(task)} />
}

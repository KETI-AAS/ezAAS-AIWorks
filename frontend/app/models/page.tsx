import type { Metadata } from "next"

import { Explore } from "@/components/works/explore"
import { parseTask } from "@/lib/works/parse-task"

export const metadata: Metadata = {
  title: "AI 찾아보기 · AI Works",
  description: "제조 현장의 문제별로 쓸 수 있는 AI 모델을 찾아보고 바로 실행해 보세요.",
}

export default async function ModelsPage({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const { task } = await searchParams
  return <Explore mode="models" initialTask={parseTask(task)} />
}

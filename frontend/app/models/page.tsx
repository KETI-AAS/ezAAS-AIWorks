import type { Metadata } from "next"

import { ModelExplorer } from "@/components/registry/model-explorer"

export const metadata: Metadata = {
  title: "AI Model — AI Model Registry",
  description: "등록된 AI 모델 목록을 탐색하세요.",
}

export default function ModelsPage() {
  return <ModelExplorer />
}

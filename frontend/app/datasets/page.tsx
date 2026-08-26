import type { Metadata } from "next"

import { DatasetExplorer } from "@/components/registry/dataset-explorer"

export const metadata: Metadata = {
  title: "AI Dataset — AI Model Registry",
  description: "등록된 AI 데이터셋 목록을 탐색하세요.",
}

export default function DatasetsPage() {
  return <DatasetExplorer />
}

import type { Metadata } from "next"

import { PairsExplorer } from "@/components/pairs/pairs-explorer"

export const metadata: Metadata = {
  title: "AI Asset Pairs — AI Model Registry",
  description:
    "AAS 메타데이터로 연결된 데이터셋–모델 페어를 탐색하세요. 하나의 데이터셋과 하나의 모델이 1:1로 연계됩니다.",
}

export default function PairsPage() {
  return <PairsExplorer />
}

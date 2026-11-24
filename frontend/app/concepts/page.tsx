import type { Metadata } from "next"

import { ConceptLab } from "@/components/concepts/concept-lab"

export const metadata: Metadata = {
  title: "AI Works V2 구조 시안 비교",
  description: "작업 공간 중심 · 안내형 · 자산 중심 세 가지 화면 구조를 같은 샘플 자산으로 비교합니다.",
}

export default function ConceptsPage() {
  return <ConceptLab />
}

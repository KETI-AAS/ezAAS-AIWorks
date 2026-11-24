import type { Metadata } from "next"

import { Register } from "@/components/works/register"

export const metadata: Metadata = {
  title: "자산 등록 · AI Works",
  description: "Model Hub에 올린 항목에 실제 모델·데이터 파일을 연결해 등록하고, 자동 검증 후 바로 사용하세요.",
}

export default function RegisterPage() {
  return <Register />
}

import type { Metadata } from "next"
import { RegisterScreen } from "@/components/v2-register/register-screen"

export const metadata: Metadata = {
  title: "내 AI 자산 준비하기 · AI Works V2",
  description: "Model Hub instance와 실제 모델·데이터 파일을 연결해 AI 자산을 등록하고 검증합니다.",
}

export default function V2RegisterPage() {
  return <RegisterScreen />
}

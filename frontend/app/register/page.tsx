import type { Metadata } from "next"

import { RegisterWorkflow } from "@/components/register/register-workflow"
import { PageHeader } from "@/components/v2/page-header"

export const metadata: Metadata = {
  title: "AI 자산 등록 — AI Model Registry",
  description:
    "ezAAS 허브에서 모델을 가져오면 AI Dataset과 AI ModelNameplate를 자동 분류하고 메타데이터를 추출하여 레지스트리에 등록합니다.",
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col">
      {/* Page header */}
      <PageHeader
        width="max-w-5xl"
        eyebrow="Step 1 · 자산 등록"
        title="AI 자산 등록"
        description="모델 허브 instance를 불러오면 Dataset·ModelNameplate 메타데이터를 자동 추출합니다. 실제 모델·데이터 파일을 연결해 등록하면 모델 검증이 이어서 진행됩니다."
      />

      {/* Workflow */}
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <RegisterWorkflow />
      </div>
    </div>
  )
}

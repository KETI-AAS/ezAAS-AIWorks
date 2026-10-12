import type { Metadata } from "next"

import { RegisterWorkflow } from "@/components/register/register-workflow"

export const metadata: Metadata = {
  title: "AI 자산 등록 — AI Model Registry",
  description:
    "ezAAS 허브에서 모델을 가져오면 AI Dataset과 AI ModelNameplate를 자동 분류하고 메타데이터를 추출하여 레지스트리에 등록합니다.",
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col">
      {/* Page header */}
      <section className="border-b border-border bg-muted/30 px-4 py-8 md:px-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl xl:whitespace-nowrap">
            AI 자산 등록
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base xl:whitespace-nowrap">
            ezAAS 허브에서 모델을 가져오면 Dataset·ModelNameplate 메타데이터를 자동 추출합니다.
          </p>
        </div>
      </section>

      {/* Workflow */}
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <RegisterWorkflow />
      </div>
    </div>
  )
}

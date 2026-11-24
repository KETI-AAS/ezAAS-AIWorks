import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { SetCurrentModel } from "@/components/works/set-current-model"
import { KeyValues, NextAction, StatusTag, TechDetails } from "@/components/works/primitives"
import type { AssetPair } from "@/lib/registry-data"
import { useCaseOf } from "@/lib/works/plain"

const VALIDATION_KO = { Validated: "검증 완료", Warnings: "확인 필요", Unvalidated: "검증 전" } as const
const ACCESS_KO = { Public: "누구나 사용", Restricted: "사내 한정", Private: "비공개" } as const

export function PairDetailView({ pair }: { pair: AssetPair }) {
  const { model, dataset } = pair
  const uc = useCaseOf(model.task)

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 py-10 md:px-8">
      <SetCurrentModel modelId={model.id} />
      <header className="flex flex-col gap-3">
        <nav aria-label="위치" className="text-sm text-muted-foreground">
          <Link href="/pairs" className="hover:underline">
            모델 + 데이터 짝
          </Link>
        </nav>
        <h1 className="text-4xl font-bold tracking-tight text-balance">
          {dataset.name}로 배운 {model.name}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground text-pretty">
          어떤 데이터로 학습한 AI인지 알면, 우리 현장에서도 잘 맞을지 가늠할 수 있어요.
        </p>
        <div className="flex flex-wrap gap-2">
          <StatusTag tone={pair.validation === "Validated" ? "success" : "warning"}>{VALIDATION_KO[pair.validation]}</StatusTag>
          <StatusTag tone="neutral">{ACCESS_KO[pair.access]}</StatusTag>
        </div>
      </header>

      <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <Link href={`/datasets/${dataset.id}`} className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border hover:shadow-md">
          <Image src={dataset.image || "/placeholder.svg"} alt="" width={800} height={450} className="aspect-[16/8] w-full object-cover" />
          <div className="flex flex-col gap-2 p-6">
            <span className="text-sm font-medium text-muted-foreground">학습 데이터</span>
            <span className="text-2xl font-semibold">{dataset.name}</span>
            <span className="text-[15px] text-muted-foreground">
              {dataset.totalSamples}건 · {dataset.traceability.dataCollector}
            </span>
          </div>
        </Link>
        <div className="flex items-center justify-center">
          <span className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-primary lg:flex-col lg:rounded-2xl lg:py-4">
            학습
            <ArrowRight aria-hidden className="size-5 max-lg:rotate-90" />
          </span>
        </div>
        <Link href={`/models/${model.id}`} className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border hover:shadow-md">
          <Image src={model.image || "/placeholder.svg"} alt="" width={800} height={450} className="aspect-[16/8] w-full object-cover" />
          <div className="flex flex-col gap-2 p-6">
            <span className="text-sm font-medium text-muted-foreground">AI 모델 · {uc.problem}</span>
            <span className="text-2xl font-semibold">{model.name}</span>
            <span className="text-[15px] text-muted-foreground">
              {uc.inputKind} → {uc.outputKind}
            </span>
          </div>
        </Link>
      </section>

      <TechDetails title="기술 정보" hint="짝 ID, 라이선스, 프레임워크, 대표 지표">
        <KeyValues
          items={[
            { label: "짝 ID", value: pair.id },
            { label: "버전", value: pair.version },
            { label: "라이선스", value: pair.license },
            { label: "프레임워크", value: pair.framework },
            { label: `대표 지표 (${pair.metric.label})`, value: `${pair.metric.value} · 등록 값` },
            { label: "내려받기", value: pair.downloadable ? "가능" : "불가" },
          ]}
        />
      </TechDetails>

      <NextAction
        title="이 짝으로 바로 추론해 보세요"
        description={`${model.name}에 사진 한 장을 넣고 결과를 확인할 수 있어요.`}
        primary={{ href: `/models/${model.id}/deploy`, label: "추론 해보기" }}
        secondary={{ href: `/training?model=${model.id}`, label: "내 데이터로 추가 학습" }}
      />
    </div>
  )
}

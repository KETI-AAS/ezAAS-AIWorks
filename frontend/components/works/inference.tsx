"use client"

import { useRouter } from "next/navigation"

import { ImageInference } from "@/components/works/inference-image"
import { SeriesInference } from "@/components/works/inference-series-direct"
import { KeyValues, NextAction, TechDetails } from "@/components/works/primitives"
import { SetCurrentModel } from "@/components/works/set-current-model"
import { models, type Dataset, type Model } from "@/lib/registry-data"
import { inputSpecOf } from "@/lib/works/io-schema"
import { useCaseOf } from "@/lib/works/plain"

export function Inference({ model, dataset }: { model: Model; dataset: Dataset }) {
  const router = useRouter()
  const uc = useCaseOf(model.task)
  const spec = inputSpecOf(model, dataset)

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 md:px-8">
      <SetCurrentModel modelId={model.id} />

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-medium text-primary">추론 해보기 · {uc.problem}</p>
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">{model.name}</h1>
          <p className="text-lg text-muted-foreground">
            {spec.kind === "timeseries"
              ? `센서 기록 ${spec.windowLength}줄을 넣으면 ${uc.outputKind}를 돌려줘요.`
              : `${uc.inputKind}를 넣으면 ${uc.outputKind}를 돌려줘요.`}
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">다른 AI로 바꾸기</span>
          <select
            value={model.id}
            onChange={(e) => router.push(`/models/${e.target.value}/deploy`)}
            className="h-11 min-w-72 rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.dataType}
              </option>
            ))}
          </select>
        </label>
      </header>

      {spec.kind === "timeseries" ? (
        <SeriesInference key={model.id} model={model} spec={spec} />
      ) : (
        <ImageInference key={model.id} model={model} dataset={dataset} spec={spec} />
      )}

      <NextAction
        title="우리 라인 데이터로 더 정확하게 만들어 볼까요?"
        description={`${model.name}를 기반으로 내 데이터를 올려 추가 학습할 수 있어요.`}
        primary={{ href: `/training?model=${model.id}`, label: "내 데이터로 추가 학습" }}
        secondary={{ href: `/models/${model.id}`, label: "AI 소개로 돌아가기" }}
      />

      <TechDetails title="실행 설정 (기술 정보)" hint="입력·출력 텐서, 실행 환경, 결과 형식">
        <KeyValues
          items={[
            { label: "입력 텐서", value: model.inputs.map((i) => `${i.name} ${i.shape}`).join(", ") },
            { label: "출력 텐서", value: model.outputs.map((o) => `${o.name} ${o.shape}`).join(", ") },
            { label: "실행 환경", value: model.supportedEnv.join(", ") },
            { label: "결과 형식", value: model.outputFormat },
          ]}
        />
      </TechDetails>
    </div>
  )
}

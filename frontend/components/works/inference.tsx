"use client"

import { Check, ImageIcon, Loader2, RotateCcw, Upload } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import { DemoNote, KeyValues, NextAction, StatusTag, TechDetails } from "@/components/works/primitives"
import { SetCurrentModel } from "@/components/works/set-current-model"
import type { Dataset, Model } from "@/lib/registry-data"
import { cn } from "@/lib/utils"
import { demoResult, useCaseOf } from "@/lib/works/plain"

type Phase = "empty" | "ready" | "running" | "done"
type Input = { kind: "sample" | "file"; name: string; preview: string | null }

const STAGES = ["입력 형식 확인", "AI 실행", "결과 정리"]
const STAGE_MS = 900

function acceptFor(model: Model) {
  if (model.task === "Anomaly Detection") return ".csv,.parquet"
  if (model.task === "OCR") return "image/*,.pdf"
  return "image/*"
}

export function Inference({ model, dataset }: { model: Model; dataset: Dataset }) {
  const uc = useCaseOf(model.task)
  const result = demoResult(model)
  const [input, setInput] = useState<Input | null>(null)
  const [phase, setPhase] = useState<Phase>("empty")
  const [stage, setStage] = useState(0)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (phase !== "running") return
    if (stage >= STAGES.length) {
      setPhase("done")
      return
    }
    const t = setTimeout(() => setStage((s) => s + 1), STAGE_MS)
    return () => clearTimeout(t)
  }, [phase, stage])

  useEffect(() => {
    if (phase === "done") resultRef.current?.focus()
  }, [phase])

  useEffect(() => {
    return () => {
      if (input?.kind === "file" && input.preview) URL.revokeObjectURL(input.preview)
    }
  }, [input])

  const pickFile = (file: File | undefined) => {
    if (!file) return
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    setInput({ kind: "file", name: file.name, preview })
    setPhase("ready")
  }

  const useSample = () => {
    setInput({ kind: "sample", name: `${dataset.name} 예시`, preview: dataset.image })
    setPhase("ready")
  }

  const run = () => {
    setStage(0)
    setPhase("running")
  }

  const reset = () => {
    setInput(null)
    setPhase("empty")
    setStage(0)
  }

  const steps = [
    { label: "입력 준비", done: phase !== "empty", current: phase === "empty" || phase === "ready" },
    { label: "실행", done: phase === "done", current: phase === "running" },
    { label: "결과 확인", done: false, current: phase === "done" },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 md:px-8">
      <SetCurrentModel modelId={model.id} />

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-medium text-primary">추론 해보기 · {uc.problem}</p>
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">{model.name}</h1>
          <p className="text-lg text-muted-foreground">
            {uc.inputKind}를 넣으면 {uc.outputKind}를 돌려줘요.
          </p>
        </div>
        <ol aria-label="진행 단계" className="flex items-center gap-2">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden className="h-px w-6 bg-border" /> : null}
              <span
                aria-current={s.current ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
                  s.current ? "bg-foreground text-background" : s.done ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {s.done && !s.current ? <Check aria-hidden className="size-4" /> : <span className="tabular-nums">{i + 1}</span>}
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </header>

      {phase !== "done" ? (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section aria-label="입력" className="flex flex-col gap-4">
            {input ? (
              <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                {input.preview ? (
                  input.kind === "sample" ? (
                    <Image src={input.preview || "/placeholder.svg"} alt="선택한 예시 입력 이미지" fill sizes="60vw" className="object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                    <img src={input.preview || "/placeholder.svg"} alt="내가 올린 입력 이미지" className="absolute inset-0 size-full object-contain" />
                  )
                ) : (
                  <p className="flex flex-col items-center gap-2 text-lg font-medium">
                    <ImageIcon aria-hidden className="size-8 text-muted-foreground" />
                    {input.name}
                  </p>
                )}
                {phase === "running" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/55 text-background">
                    <Loader2 aria-hidden className="size-8 animate-spin" />
                    <p className="text-lg font-semibold" aria-live="polite">
                      {STAGES[Math.min(stage, STAGES.length - 1)]} 중…
                    </p>
                  </div>
                ) : null}
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl bg-card/95 px-4 py-3 shadow-sm">
                  <span className="truncate text-[15px] font-medium">
                    {input.kind === "sample" ? "예시 입력" : "내가 올린 파일"} · {input.name}
                  </span>
                  {phase === "ready" ? (
                    <button type="button" onClick={reset} className="shrink-0 text-sm font-medium text-primary hover:underline">
                      다른 입력 고르기
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  pickFile(e.dataTransfer.files[0])
                }}
                className={cn(
                  "flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed bg-card p-8 text-center transition-colors",
                  dragging ? "border-primary bg-secondary" : "border-border",
                )}
              >
                <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
                  <Upload aria-hidden className="size-6" />
                </span>
                <div className="flex flex-col gap-2">
                  <p className="text-xl font-semibold">{uc.inputKind}를 여기로 끌어 놓으세요</p>
                  <p className="text-[15px] text-muted-foreground">{model.input}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-lg border border-border bg-card px-5 py-3 text-[15px] font-semibold hover:bg-muted"
                  >
                    내 파일 고르기
                  </button>
                  <button
                    type="button"
                    onClick={useSample}
                    className="rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    예시로 바로 해보기
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={acceptFor(model)}
                  className="sr-only"
                  aria-label="입력 파일 선택"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border">
              <h2 className="text-lg font-semibold">실행하면 이런 걸 받아요</h2>
              <ul className="flex flex-wrap gap-2">
                {model.outputItems.map((o) => (
                  <li key={o} className="rounded-md bg-muted px-2.5 py-1 text-sm font-medium">
                    {o}
                  </li>
                ))}
              </ul>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{model.outputDescription}</p>
              <button
                type="button"
                onClick={run}
                disabled={phase !== "ready"}
                className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent text-base font-semibold text-accent-foreground transition-colors hover:bg-accent/85 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {phase === "running" ? (
                  <>
                    <Loader2 aria-hidden className="size-4 animate-spin" /> 실행 중
                  </>
                ) : (
                  "AI 실행하기"
                )}
              </button>
              {phase === "empty" ? (
                <p className="text-sm text-muted-foreground">먼저 왼쪽에서 입력을 골라 주세요.</p>
              ) : null}
              {phase === "running" ? (
                <ol className="flex flex-col gap-2" aria-label="실행 진행">
                  {STAGES.map((s, i) => (
                    <li key={s} className="flex items-center gap-2 text-[15px]">
                      {i < stage ? (
                        <Check aria-hidden className="size-4 text-success" />
                      ) : i === stage ? (
                        <Loader2 aria-hidden className="size-4 animate-spin text-primary" />
                      ) : (
                        <span aria-hidden className="size-4 rounded-full border border-border" />
                      )}
                      <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
            <DemoNote>데모 환경이에요. 실제 모델을 실행하지 않고, 정해진 예시 결과를 보여 줍니다.</DemoNote>
          </aside>
        </div>
      ) : (
        <section aria-label="결과" className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <figure className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              <Image
                src={model.resultImage || "/placeholder.svg"}
                alt={`${model.name}의 결과 예시 이미지`}
                width={1400}
                height={933}
                className="aspect-[3/2] w-full object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full bg-card/95 px-3 py-1.5 text-sm font-medium shadow-sm">예시 결과</span>
              {input?.kind === "file" && input.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img
                  src={input.preview || "/placeholder.svg"}
                  alt="내가 올린 원본"
                  className="absolute bottom-4 right-4 aspect-[4/3] w-36 rounded-lg border-2 border-card object-cover shadow-md"
                />
              ) : null}
            </div>
            <figcaption className="text-sm text-muted-foreground">
              입력: {input?.name}
              {input?.kind === "file" ? " · 데모에서는 내 파일 대신 샘플 결과 이미지를 보여 줘요." : ""}
            </figcaption>
          </figure>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
              <StatusTag tone="success">실행 완료</StatusTag>
              <h2 ref={resultRef} tabIndex={-1} className="text-2xl font-bold leading-snug text-balance outline-none">
                {result.headline}
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{result.summary}</p>
              <ul className="mt-2 flex flex-col gap-3">
                {result.findings.map((f) => (
                  <li key={f.label} className="flex flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] font-semibold">
                        {f.label} <span className="font-normal text-muted-foreground">· {f.where}</span>
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">확신 {Math.round(f.score * 100)}%</span>
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn("block h-full rounded-full", f.score >= 0.8 ? "bg-primary" : "bg-warning")}
                        style={{ width: `${f.score * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-secondary p-5">
              <h3 className="text-[15px] font-semibold text-primary">이 결과를 어떻게 봐야 하나요?</h3>
              <p className="text-[15px] leading-relaxed">
                확신이 80% 미만인 항목은 사람이 한 번 더 확인하는 것이 좋아요. 우리 라인 사진에서 놓치는 결함이 많다면 추가 학습으로
                정확도를 높일 수 있습니다.
              </p>
            </div>
            <DemoNote>예시 결과예요. 실제 모델을 실행한 값이 아닙니다.</DemoNote>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-border bg-card px-4 py-2.5 text-[15px] font-medium hover:bg-muted"
            >
              <RotateCcw aria-hidden className="size-4" /> 다른 입력으로 다시 해보기
            </button>
          </div>

          <NextAction
            className="lg:col-span-2"
            title="우리 라인 데이터로 더 정확하게 만들어 볼까요?"
            description={`${model.name}를 기반으로 내 데이터를 올려 추가 학습할 수 있어요.`}
            primary={{ href: `/training?model=${model.id}`, label: "내 데이터로 추가 학습" }}
            secondary={{ href: `/models/${model.id}`, label: "AI 소개로 돌아가기" }}
          />
        </section>
      )}

      <TechDetails title="실행 설정 (기술 정보)" hint="입력 텐서, 실행 환경, 결과 형식">
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

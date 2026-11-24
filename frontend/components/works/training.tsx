"use client"

import { AlertTriangle, ArrowRight, Check, CheckCircle2, FileUp, Loader2, RotateCcw, Sparkles, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { DemoNote, KeyValues, NextAction, StatusTag, TechDetails } from "@/components/works/primitives"
import { getDataset, getModel, models, type Model } from "@/lib/registry-data"
import { cn } from "@/lib/utils"
import { nextVersion, PERFORMANCE_METRICS, primaryMetric, TRAINING_LOG_LINES, TRAINING_MAPPING_ROWS } from "@/lib/training-data"
import { setCurrentModel, useCurrentModelId } from "@/lib/works/work-context"
import { useCaseOf } from "@/lib/works/plain"

type Step = "model" | "data" | "prep" | "train" | "result"
type DataFile = { name: string; summary: string }
type PrepItem = { id: string; title: string; detail: string; kind: "auto" | "review"; choice?: "keep" | "exclude" }

const STEPS: { key: Step; label: string }[] = [
  { key: "model", label: "AI 확인" },
  { key: "data", label: "내 데이터 올리기" },
  { key: "prep", label: "자동 정리" },
  { key: "train", label: "추가 학습" },
  { key: "result", label: "결과 보기" },
]

const isImageModel = (m: Model) => m.dataType === "이미지" || m.task !== "Anomaly Detection"

function prepItemsFor(model: Model): PrepItem[] {
  if (isImageModel(model)) {
    return [
      { id: "resize", kind: "auto", title: "사진 크기를 AI가 받는 크기로 맞췄어요", detail: "1,260장 모두 AI 입력 크기에 맞게 조정" },
      { id: "label", kind: "auto", title: "라벨 형식을 학습용으로 바꿨어요", detail: "COCO 형식 → 학습용 형식 자동 변환" },
      { id: "dup", kind: "auto", title: "똑같은 사진 9장을 뺐어요", detail: "중복된 사진은 학습에 도움이 되지 않아요" },
      { id: "nolabel", kind: "review", title: "라벨이 없는 사진이 6장 있어요", detail: "결함 표시가 없는 사진이에요. 양품이라면 유지, 아니라면 빼 주세요." },
      { id: "blur", kind: "review", title: "흐린 사진이 14장 있어요", detail: "초점이 맞지 않은 사진은 결함을 잘못 배울 수 있어요." },
    ]
  }
  return TRAINING_MAPPING_ROWS.map((r) => ({
    id: r.column,
    kind: r.status === "auto" ? "auto" : "review",
    choice: r.status === "excluded" ? "exclude" : undefined,
    title: r.status === "auto" ? `${r.column} 열을 '${r.meaning}'(으)로 연결했어요` : `${r.column} 열이 '${r.meaning}'이 맞나요?`,
    detail: `확신 ${Math.round(r.confidence * 100)}% · ${r.type}`,
  }))
}

export function Training() {
  const params = useSearchParams()
  const router = useRouter()
  const [ctxId] = useCurrentModelId()
  const initialId = params.get("model") ?? ctxId ?? "yolov8-car-inspection"
  const [modelId, setModelId] = useState(getModel(initialId) ? initialId : "yolov8-car-inspection")
  const model = getModel(modelId)!
  const dataset = getDataset(model.datasetId)
  const [step, setStep] = useState<Step>(params.get("view") === "result" ? "result" : params.get("model") ? "data" : "model")
  const [file, setFile] = useState<DataFile | null>(
    params.get("view") === "result" ? { name: "line2_exterior_1124.zip", summary: "사진 1,260장 · 라벨 포함" } : null,
  )
  const [items, setItems] = useState<PrepItem[]>(() =>
    prepItemsFor(model).map((i) => (params.get("view") === "result" && i.kind === "review" ? { ...i, choice: "keep" } : i)),
  )
  const [mode, setMode] = useState<"quick" | "precise">("quick")
  const [progress, setProgress] = useState(params.get("view") === "result" ? 100 : 0)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
  }, [])

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const chooseModel = (id: string) => {
    setModelId(id)
    setCurrentModel(id)
    setFile(null)
    setItems(prepItemsFor(getModel(id)!))
    setProgress(0)
  }

  const pending = items.filter((i) => i.kind === "review" && !i.choice).length
  const stepIndex = STEPS.findIndex((s) => s.key === step)
  const reachable = (s: Step) => {
    const i = STEPS.findIndex((x) => x.key === s)
    if (i <= 1) return true
    if (i === 2) return Boolean(file)
    if (i === 3) return Boolean(file) && pending === 0
    return progress >= 100
  }

  const start = () => {
    setRunning(true)
    setProgress(0)
    const total = mode === "quick" ? 60 : 100
    let tick = 0
    timer.current = setInterval(() => {
      tick += 1
      setProgress(Math.min(100, Math.round((tick / total) * 100)))
      if (tick >= total) {
        if (timer.current) clearInterval(timer.current)
        setRunning(false)
        setStep("result")
      }
    }, 60)
  }

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    setRunning(false)
    setProgress(0)
  }

  const restart = () => {
    stop()
    setFile(null)
    setItems(prepItemsFor(model))
    setStep("data")
    router.replace(`/training?model=${model.id}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-medium text-primary">내 데이터로 학습</p>
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">우리 라인 데이터로 AI를 더 맞춰요</h1>
          <p className="text-lg text-muted-foreground">기존 AI를 바탕으로 내 데이터를 더 배워 새 버전을 만들어요.</p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-card p-3 pr-5 ring-1 ring-border">
          <Image src={model.image || "/placeholder.svg"} alt="" width={96} height={72} className="h-14 w-20 rounded-lg object-cover" />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">학습할 AI · {useCaseOf(model.task).problem}</span>
            <span className="text-base font-semibold">{model.name}</span>
            <span className="text-sm text-muted-foreground">기본 데이터: {dataset?.name}</span>
          </div>
        </div>
      </header>

      <ol aria-label="학습 단계" className="grid grid-cols-5 gap-2">
        {STEPS.map((s, i) => {
          const current = s.key === step
          const done = i < stepIndex
          const can = reachable(s.key) && !running
          return (
            <li key={s.key}>
              <button
                type="button"
                disabled={!can}
                onClick={() => setStep(s.key)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex w-full flex-col items-start gap-1 border-t-4 pt-3 text-left disabled:cursor-not-allowed",
                  current ? "border-primary" : done ? "border-success" : "border-border",
                )}
              >
                <span className={cn("text-sm tabular-nums", done ? "text-success" : "text-muted-foreground")}>
                  {done ? "완료" : `${i + 1}단계`}
                </span>
                <span className={cn("text-[15px] font-semibold", !current && !done && "text-muted-foreground")}>{s.label}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {step === "model" ? (
        <section aria-labelledby="t-model" className="flex flex-col gap-5">
          <h2 ref={headingRef} tabIndex={-1} id="t-model" className="text-2xl font-bold outline-none">
            어떤 AI를 바탕으로 학습할까요?
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {models.map((m) => {
              const selected = m.id === model.id
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => chooseModel(m.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl bg-card p-4 text-left ring-1 transition",
                      selected ? "ring-2 ring-primary" : "ring-border hover:ring-foreground/30",
                    )}
                  >
                    <Image src={m.image || "/placeholder.svg"} alt="" width={120} height={90} className="h-16 w-24 rounded-lg object-cover" />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm text-primary">{useCaseOf(m.task).problem}</span>
                      <span className="font-semibold leading-snug">{m.name}</span>
                    </span>
                    {selected ? <CheckCircle2 aria-hidden className="ml-auto size-5 shrink-0 text-primary" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep("data")}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              이 AI로 진행 <ArrowRight aria-hidden className="size-4" />
            </button>
          </div>
        </section>
      ) : null}

      {step === "data" ? (
        <DataStep
          model={model}
          file={file}
          headingRef={headingRef}
          onFile={(f) => {
            setFile(f)
            setItems(prepItemsFor(model))
          }}
          onNext={() => setStep("prep")}
        />
      ) : null}

      {step === "prep" && file ? (
        <section aria-labelledby="t-prep" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 ref={headingRef} tabIndex={-1} id="t-prep" className="text-2xl font-bold outline-none">
                {file.name}을(를) 학습할 수 있게 정리했어요
              </h2>
              <p className="text-[15px] text-muted-foreground">
                대부분은 자동으로 처리했어요. {pending > 0 ? `${pending}가지만 직접 골라 주세요.` : "직접 확인할 것도 모두 끝났어요."}
              </p>
            </div>

            {items.some((i) => i.kind === "review") ? (
              <div className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <AlertTriangle aria-hidden className="size-5 text-warning" /> 확인이 필요해요
                </h3>
                <ul className="flex flex-col gap-3">
                  {items
                    .filter((i) => i.kind === "review")
                    .map((i) => (
                      <li
                        key={i.id}
                        className={cn(
                          "flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:justify-between",
                          i.choice ? "bg-card ring-1 ring-border" : "bg-warning/12 ring-2 ring-warning/50",
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          <p className="text-base font-semibold">{i.title}</p>
                          <p className="text-[15px] text-muted-foreground">{i.detail}</p>
                        </div>
                        <div role="group" aria-label={`${i.title} 처리 방법`} className="flex shrink-0 gap-2">
                          {(["keep", "exclude"] as const).map((c) => (
                            <button
                              key={c}
                              type="button"
                              aria-pressed={i.choice === c}
                              onClick={() => setItems((prev) => prev.map((p) => (p.id === i.id ? { ...p, choice: c } : p)))}
                              className={cn(
                                "rounded-lg px-4 py-2.5 text-[15px] font-semibold ring-1",
                                i.choice === c ? "bg-foreground text-background ring-foreground" : "bg-card ring-border hover:bg-muted",
                              )}
                            >
                              {c === "keep" ? (isImageModel(model) ? "그대로 쓰기" : "맞아요") : "빼기"}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles aria-hidden className="size-5 text-primary" /> 자동으로 처리했어요
              </h3>
              <ul className="grid gap-2 md:grid-cols-2">
                {items
                  .filter((i) => i.kind === "auto")
                  .map((i) => (
                    <li key={i.id} className="flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-border">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-medium">{i.title}</span>
                        <span className="text-sm text-muted-foreground">{i.detail}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border">
              <h3 className="text-lg font-semibold">정리 결과</h3>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  { k: "자동 처리", v: items.filter((i) => i.kind === "auto").length },
                  { k: "확인 남음", v: pending },
                  { k: "뺀 항목", v: items.filter((i) => i.choice === "exclude").length },
                ].map((s) => (
                  <div key={s.k} className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3">
                    <dt className="text-sm text-muted-foreground">{s.k}</dt>
                    <dd className="text-2xl font-bold tabular-nums">{s.v}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                disabled={pending > 0}
                onClick={() => setStep("train")}
                className="h-12 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {pending > 0 ? `${pending}가지를 먼저 골라 주세요` : "이대로 학습 준비"}
              </button>
              <button type="button" onClick={() => setStep("data")} className="text-[15px] font-medium text-primary hover:underline">
                다른 파일 올리기
              </button>
            </div>
            <DemoNote>데모 환경이에요. 정리 항목은 예시이며 실제 파일 내용을 읽지 않았어요.</DemoNote>
          </aside>
        </section>
      ) : null}

      {step === "train" ? (
        <section aria-labelledby="t-train" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-6 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
            <h2 ref={headingRef} tabIndex={-1} id="t-train" className="text-2xl font-bold outline-none">
              {running ? "AI가 내 데이터를 배우고 있어요" : progress >= 100 ? "학습이 끝났어요" : "어떻게 학습할까요?"}
            </h2>
            {!running && progress < 100 ? (
              <div role="radiogroup" aria-label="학습 방식" className="grid gap-3 md:grid-cols-2">
                {[
                  { k: "quick" as const, t: "빠르게", d: "먼저 효과가 있는지 확인할 때 좋아요." },
                  { k: "precise" as const, t: "꼼꼼하게", d: "더 오래 배우는 대신 더 안정적인 결과를 노려요." },
                ].map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    role="radio"
                    aria-checked={mode === o.k}
                    onClick={() => setMode(o.k)}
                    className={cn(
                      "flex flex-col gap-1 rounded-xl p-5 text-left ring-1",
                      mode === o.k ? "bg-secondary ring-2 ring-primary" : "ring-border hover:bg-muted",
                    )}
                  >
                    <span className="text-lg font-semibold">{o.t}</span>
                    <span className="text-[15px] text-muted-foreground">{o.d}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4" aria-live="polite">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-medium">
                    {TRAINING_LOG_LINES[Math.min(Math.floor((progress / 100) * (TRAINING_LOG_LINES.length - 1)), TRAINING_LOG_LINES.length - 1)]}
                  </span>
                  <span className="text-4xl font-bold tabular-nums">{progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[15px] text-muted-foreground">학습 데이터 80%로 배우고, 나머지 20%로 얼마나 맞히는지 확인해요.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {running ? (
                <button type="button" onClick={stop} className="rounded-lg border border-border px-5 py-3 font-semibold hover:bg-muted">
                  학습 멈추기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={start}
                  className="h-12 rounded-lg bg-accent px-6 font-semibold text-accent-foreground hover:bg-accent/85"
                >
                  학습 시작
                </button>
              )}
            </div>
          </div>
          <aside className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
              <h3 className="text-lg font-semibold">이렇게 학습해요</h3>
              <KeyValues
                items={[
                  { label: "바탕 AI", value: `${model.name} ${model.version}` },
                  { label: "내 데이터", value: `${file?.name} · ${file?.summary}` },
                  { label: "기본 데이터", value: dataset?.name ?? "-" },
                  { label: "새 버전", value: nextVersion(model.version) },
                ]}
              />
            </div>
            <TechDetails title="학습 설정 (기술 정보)" hint="방식, 반복 횟수, 분할 비율">
              <KeyValues
                items={[
                  { label: "방식", value: "Fine-tuning" },
                  { label: "Epoch", value: mode === "quick" ? "10" : "20" },
                  { label: "학습/검증 분할", value: "80 / 20" },
                  { label: "학습률", value: "Auto" },
                ]}
              />
            </TechDetails>
            <DemoNote>데모 환경이에요. 실제 학습은 진행되지 않고 진행 표시만 보여 줘요.</DemoNote>
          </aside>
        </section>
      ) : null}

      {step === "result" ? <ResultStep model={model} fileName={file?.name ?? "line2_exterior_1124.zip"} headingRef={headingRef} onRestart={restart} /> : null}
    </div>
  )
}

function DataStep({
  model,
  file,
  onFile,
  onNext,
  headingRef,
}: {
  model: Model
  file: DataFile | null
  onFile: (f: DataFile | null) => void
  onNext: () => void
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  const image = isImageModel(model)
  const accept = image ? ".zip" : ".csv,.zip"
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const take = (f: File | undefined) => {
    if (!f) return
    const ok = accept.split(",").some((ext) => f.name.toLowerCase().endsWith(ext))
    if (!ok) {
      setError(`${accept.replace(/,/g, " 또는 ")} 파일만 올릴 수 있어요.`)
      return
    }
    setError(null)
    onFile({ name: f.name, summary: `${(f.size / 1e6).toFixed(1)} MB` })
  }
  return (
    <section aria-labelledby="t-data" className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <h2 ref={headingRef} tabIndex={-1} id="t-data" className="text-2xl font-bold outline-none">
          우리 라인에서 모은 {image ? "사진" : "기록"}을 올려 주세요
        </h2>
        {file ? (
          <div className="flex flex-col gap-4 rounded-2xl bg-success/10 p-6">
            <span className="flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 aria-hidden className="size-5" /> 파일을 받았어요
            </span>
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-xl font-semibold">{file.name}</span>
                <span className="text-[15px] text-muted-foreground">{file.summary}</span>
              </span>
              <button type="button" onClick={() => onFile(null)} aria-label="파일 빼기" className="rounded-md p-2 hover:bg-card">
                <X aria-hidden className="size-5" />
              </button>
            </span>
            <button
              type="button"
              onClick={onNext}
              className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              자동 정리 시작 <ArrowRight aria-hidden className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
            <FileUp aria-hidden className="size-10 text-primary" />
            <p className="text-lg font-semibold">{accept} 파일을 고르세요</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => ref.current?.click()} className="rounded-lg border border-border px-5 py-3 font-semibold hover:bg-muted">
                내 파일 고르기
              </button>
              <button
                type="button"
                onClick={() =>
                  onFile(
                    image
                      ? { name: "line2_exterior_1124.zip", summary: "사진 1,260장 · 라벨 포함" }
                      : { name: "legacy_data.csv", summary: "7개 열 · 12,480행" },
                  )
                }
                className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                예시 데이터로 해보기
              </button>
            </div>
            <input ref={ref} type="file" accept={accept} className="sr-only" aria-label="학습 데이터 선택" onChange={(e) => take(e.target.files?.[0])} />
            {error ? (
              <p role="alert" className="text-[15px] text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>
      <aside className="flex flex-col gap-4 rounded-2xl bg-secondary p-6">
        <h3 className="text-lg font-semibold text-primary">어떤 데이터가 필요한가요?</h3>
        <ul className="flex flex-col gap-3 text-[15px] leading-relaxed">
          {(image
            ? [
                "검사 카메라로 찍은 사진을 한 압축 파일(.zip)에 담아 주세요.",
                "결함이 있는 사진에는 어디가 결함인지 표시(라벨)가 있으면 좋아요.",
                "크기나 라벨 형식이 달라도 자동으로 맞춰 드려요.",
              ]
            : [
                "센서 기록을 표 형식(.csv)으로 올려 주세요.",
                "불량 여부처럼 맞혀야 할 값이 담긴 열이 필요해요.",
                "열 이름이 달라도 의미를 찾아 자동으로 연결해 드려요.",
              ]
          ).map((t) => (
            <li key={t} className="flex gap-2">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" /> {t}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">파일은 데모 환경에서 서버로 보내지지 않아요.</p>
      </aside>
    </section>
  )
}

function ResultStep({
  model,
  fileName,
  onRestart,
  headingRef,
}: {
  model: Model
  fileName: string
  onRestart: () => void
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  const base = primaryMetric(model)
  const baseValue = Number(base.value)
  const nextValue = useMemo(() => Math.min(0.999, baseValue + 0.021), [baseValue])
  const version = nextVersion(model.version)
  return (
    <section aria-labelledby="t-result" className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
          <StatusTag tone="success">학습 완료</StatusTag>
          <h2 ref={headingRef} tabIndex={-1} id="t-result" className="text-3xl font-bold leading-tight text-balance outline-none">
            {model.name} {version}이(가) 만들어졌어요
          </h2>
          <p className="text-lg leading-relaxed text-pretty">
            {fileName}로 추가 학습했어요. 따로 떼어 둔 내 데이터로 시험해 보니 기존 버전보다 조금 더 잘 맞혔어요.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-5">
              <span className="text-sm text-muted-foreground">기존 {model.version}</span>
              <span className="text-4xl font-bold tabular-nums text-muted-foreground">{(baseValue * 100).toFixed(1)}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl bg-success/10 p-5">
              <span className="text-sm text-success">새 {version}</span>
              <span className="text-4xl font-bold tabular-nums">{(nextValue * 100).toFixed(1)}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            숫자는 100점 만점 기준 {base.label} 점수예요. 데모용 예시 값이며 실제 학습 결과가 아닙니다.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-2xl bg-secondary p-6">
            <h3 className="text-lg font-semibold text-primary">이 결과를 어떻게 봐야 하나요?</h3>
            <ul className="flex flex-col gap-2 text-[15px] leading-relaxed">
              <li>점수가 올랐다는 건 우리 라인 사진에서 결함을 더 잘 찾았다는 뜻이에요.</li>
              <li>점수만으로 판단하기보다 실제 사진을 몇 장 넣어 결과를 눈으로 확인해 보세요.</li>
              <li>현장에 쓰기 전에는 놓친 결함이 없는지 사람이 함께 점검하는 것이 좋아요.</li>
            </ul>
          </div>
          <DemoNote>새 버전은 데모 화면에서만 보이며 Model Hub에 저장되지 않아요.</DemoNote>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-4 py-2.5 font-medium hover:bg-muted"
          >
            <RotateCcw aria-hidden className="size-4" /> 다른 데이터로 다시 학습
          </button>
        </div>
      </div>
      <NextAction
        title="새 버전으로 직접 사진을 넣어 볼까요?"
        description="추론 화면에서 결과를 눈으로 확인할 수 있어요."
        primary={{ href: `/models/${model.id}/deploy`, label: "새 버전으로 추론 해보기" }}
        secondary={{ href: `/models/${model.id}`, label: "AI 소개 보기" }}
      />
      <TechDetails title="세부 성능 지표 (기술 정보)" hint="Precision, Recall, F1 등 · 예시 값">
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr className="text-sm text-muted-foreground">
              <th className="py-2 font-medium">지표</th>
              <th className="py-2 font-medium">기존</th>
              <th className="py-2 font-medium">새 버전</th>
            </tr>
          </thead>
          <tbody>
            {PERFORMANCE_METRICS.map((m) => (
              <tr key={m.label} className="border-t border-border">
                <td className="py-2">{m.label}</td>
                <td className="py-2 tabular-nums">{m.base.toFixed(3)}</td>
                <td className="py-2 font-semibold tabular-nums">{m.next.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TechDetails>
      <p className="text-sm text-muted-foreground">
        다른 AI도 살펴보려면{" "}
        <Link href="/models" className="font-medium text-primary hover:underline">
          AI 찾아보기
        </Link>
        로 가세요.
      </p>
    </section>
  )
}

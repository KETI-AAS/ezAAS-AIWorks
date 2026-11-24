"use client"

import { ChevronDown, Loader2, Play, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { SeriesCsvRunner } from "@/components/works/inference-series"
import { DemoNote, StatusTag } from "@/components/works/primitives"
import type { Model } from "@/lib/registry-data"
import { cn } from "@/lib/utils"
import type { SeriesChannel, SeriesInputSpec } from "@/lib/works/io-schema"

type Values = Record<string, string>

const PRESETS: { label: string; values: Record<string, number> }[] = [
  { label: "정상 예시", values: { TEMP_01: 62.4, VIB_VEL: 4.3, MOTOR_A: 18.6 } },
  { label: "진동 이상 예시", values: { TEMP_01: 66.1, VIB_VEL: 11.8, MOTOR_A: 19.4 } },
  { label: "과열 예시", values: { TEMP_01: 88.5, VIB_VEL: 5.1, MOTOR_A: 24.9 } },
]

/** Demo-only reference levels used to fake a result from three numbers. Not part of the model. */
const DEMO_BASELINE: Record<string, { normal: number; alarm: number }> = {
  TEMP_01: { normal: 65, alarm: 85 },
  VIB_VEL: { normal: 6, alarm: 14 },
  MOTOR_A: { normal: 22, alarm: 34 },
}

const FAULT_KO: Record<string, string> = {
  Normal: "정상",
  "Bearing Wear": "베어링 마모",
  Misalignment: "축 정렬 불량",
  Overheat: "과열",
}

function fieldError(ch: SeriesChannel, raw: string | undefined) {
  const v = (raw ?? "").trim()
  if (!v) return ch.required ? "값을 입력해 주세요." : null
  const n = Number(v)
  if (!Number.isFinite(n)) return "숫자만 입력할 수 있어요."
  if (n < ch.range.min || n > ch.range.max) return `${ch.range.min}–${ch.range.max} ${ch.unit} 사이로 입력해 주세요.`
  return null
}

function demoResult(spec: SeriesInputSpec, values: Values) {
  const parts = spec.channels.map((ch) => {
    const ref = DEMO_BASELINE[ch.name] ?? { normal: ch.range.max * 0.5, alarm: ch.range.max * 0.8 }
    const v = Number(values[ch.name])
    const level = Math.min(1, Math.max(0, (v - ref.normal) / (ref.alarm - ref.normal)))
    return { ch, v, level }
  })
  const top = parts.reduce((a, b) => (b.level > a.level ? b : a))
  const score = Math.min(0.99, 0.06 + top.level * 0.9)
  const anomalous = score >= spec.threshold.value
  let fault = "Normal"
  if (anomalous) {
    if (top.ch.name === "TEMP_01") fault = "Overheat"
    else if (top.ch.name === "VIB_VEL") fault = (parts.find((p) => p.ch.name === "MOTOR_A")?.level ?? 0) > 0.3 ? "Bearing Wear" : "Misalignment"
    else fault = "Bearing Wear"
  }
  if (!spec.faultLabels.includes(fault)) fault = anomalous ? spec.faultLabels.find((l) => l !== "Normal") ?? fault : "Normal"
  return { parts, top, score, anomalous, fault, rulDays: Math.max(3, Math.round(120 * (1 - score))) }
}

export function SeriesInference({ model, spec }: { model: Model; spec: SeriesInputSpec }) {
  const [values, setValues] = useState<Values>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle")
  const [ranWith, setRanWith] = useState<Values | null>(null)

  const errors = useMemo(
    () => Object.fromEntries(spec.channels.map((ch) => [ch.name, fieldError(ch, values[ch.name])])) as Record<string, string | null>,
    [spec.channels, values],
  )
  const valid = spec.channels.every((ch) => !errors[ch.name])
  const result = useMemo(() => (ranWith ? demoResult(spec, ranWith) : null), [ranWith, spec])

  useEffect(() => {
    if (phase !== "running") return
    const t = setTimeout(() => setPhase("done"), 1100)
    return () => clearTimeout(t)
  }, [phase])

  const update = (name: string, v: string) => {
    setValues((s) => ({ ...s, [name]: v }))
    if (phase === "done") setPhase("idle")
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!valid) {
      const first = spec.channels.find((ch) => errors[ch.name])
      if (first) document.getElementById(`f-${first.name}`)?.focus()
      return
    }
    setRanWith(values)
    setPhase("running")
  }

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setValues(Object.fromEntries(spec.channels.map((ch) => [ch.name, String(p.values[ch.name] ?? "")])))
    setTouched({})
    setSubmitted(false)
    setPhase("idle")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={submit} noValidate aria-labelledby="direct-title" className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-1 ring-border">
          <div className="flex flex-col gap-1">
            <h2 id="direct-title" className="text-lg font-semibold">
              지금 센서 값을 넣어 보세요
            </h2>
            <p className="text-[15px] text-muted-foreground">세 값을 넣고 실행하면 설비 상태를 바로 보여 줘요.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">예시 값</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-full border border-border px-3 py-1 text-sm font-medium hover:bg-muted"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {spec.channels.map((ch) => {
              const show = (submitted || touched[ch.name]) && errors[ch.name]
              const id = `f-${ch.name}`
              return (
                <div key={ch.name} className="flex flex-col gap-1.5">
                  <label htmlFor={id} className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold">
                      {ch.label}
                      {ch.required ? <span className="sr-only"> (필수)</span> : null}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{ch.name}</span>
                  </label>
                  <div
                    className={cn(
                      "flex items-center rounded-lg border bg-background focus-within:ring-2",
                      show ? "border-destructive focus-within:ring-destructive/20" : "border-input focus-within:border-primary focus-within:ring-primary/20",
                    )}
                  >
                    <input
                      id={id}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      required={ch.required}
                      value={values[ch.name] ?? ""}
                      onChange={(e) => update(ch.name, e.target.value)}
                      onBlur={() => setTouched((s) => ({ ...s, [ch.name]: true }))}
                      aria-invalid={Boolean(show)}
                      aria-describedby={`${id}-hint`}
                      placeholder={String(PRESETS[0].values[ch.name] ?? "")}
                      className="h-12 w-full min-w-0 bg-transparent px-4 text-lg tabular-nums outline-none"
                    />
                    <span className="shrink-0 border-l border-border px-4 text-[15px] font-medium text-muted-foreground">{ch.unit}</span>
                  </div>
                  <p id={`${id}-hint`} className={cn("text-sm", show ? "text-destructive" : "text-muted-foreground")}>
                    {show ? errors[ch.name] : `허용 범위 ${ch.range.min}–${ch.range.max} ${ch.unit}`}
                  </p>
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            disabled={phase === "running"}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
          >
            {phase === "running" ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Play aria-hidden className="size-4" />}
            {phase === "running" ? "AI가 판단하는 중..." : "AI 실행하기"}
          </button>
        </form>

        <section aria-live="polite" aria-label="결과" className="flex flex-col gap-4">
          {phase === "done" && result ? (
            <DirectResult model={model} spec={spec} result={result} onReset={() => setPhase("idle")} />
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
              <h2 className="text-lg font-semibold">결과는 여기에 나와요</h2>
              <ul className="flex flex-col gap-2">
                {model.outputs.map((o) => (
                  <li key={o.name} className="rounded-md bg-muted px-3 py-2 text-[15px]">
                    {o.description}
                  </li>
                ))}
              </ul>
              {phase === "running" ? <p className="text-sm text-muted-foreground">입력한 값을 살펴보고 있어요...</p> : null}
            </div>
          )}
          <DemoNote>
            데모예요. 실제 모델은 {spec.windowLength}초 동안의 연속 기록({spec.tensorShape})을 받기 때문에, 세 값만으로는 실행되지 않아요. 여기 결과는 입력 값으로 흉내 낸
            예시입니다.
          </DemoNote>
        </section>
      </div>

      <details className="group rounded-2xl bg-card ring-1 ring-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span className="text-base font-semibold">고급 입력 · 실제 데이터로 실행</span>
            <span className="text-sm text-muted-foreground">
              실제 모델 입력 형식인 {spec.windowLength}줄 센서 기록(CSV)을 넣어요.
            </span>
          </span>
          <ChevronDown aria-hidden className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border p-5">
          <SeriesCsvRunner model={model} spec={spec} />
        </div>
      </details>
    </div>
  )
}

function DirectResult({
  model,
  spec,
  result,
  onReset,
}: {
  model: Model
  spec: SeriesInputSpec
  result: ReturnType<typeof demoResult>
  onReset: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])
  const has = (name: string) => model.outputs.some((o) => o.name === name)
  const faultKo = FAULT_KO[result.fault] ?? result.fault

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-1 ring-border">
      <div className="flex items-center justify-between gap-3">
        <StatusTag tone={result.anomalous ? "danger" : "success"}>{result.anomalous ? "점검 필요" : "정상"}</StatusTag>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <RotateCcw aria-hidden className="size-3.5" /> 값 바꿔서 다시
        </button>
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-snug text-balance outline-none">
        {result.anomalous ? `${faultKo} 가능성이 있어요` : "설비가 정상 범위에서 움직이고 있어요"}
      </h2>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        {result.anomalous
          ? `${result.top.ch.label}(${result.top.v} ${result.top.ch.unit})가 평소보다 높아요. 현장에서 설비 상태를 확인해 보세요.`
          : "세 값 모두 평소 수준이에요. 지금 점검 주기를 유지하면 돼요."}
      </p>

      <dl className="grid grid-cols-3 gap-3">
        {has("anomaly_score") ? (
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
            <dt className="text-sm text-muted-foreground">이상 점수</dt>
            <dd className="text-3xl font-bold tabular-nums">{result.score.toFixed(2)}</dd>
            <dd className="text-xs text-muted-foreground">{spec.threshold.value} 이상이면 이상</dd>
          </div>
        ) : null}
        {has("fault_type") ? (
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
            <dt className="text-sm text-muted-foreground">이상 유형</dt>
            <dd className="text-xl font-bold">{faultKo}</dd>
            <dd className="font-mono text-xs text-muted-foreground">{result.fault}</dd>
          </div>
        ) : null}
        {has("rul_days") ? (
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
            <dt className="text-sm text-muted-foreground">남은 수명</dt>
            <dd className="text-3xl font-bold tabular-nums">
              {result.rulDays}
              <span className="ml-1 text-base font-medium">일</span>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-col gap-2.5">
        <p className="text-sm font-medium">값별 영향</p>
        {result.parts.map((p) => (
          <div key={p.ch.name} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0">{p.ch.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className={cn("h-full rounded-full", p.level > 0.5 ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.max(4, p.level * 100)}%` }}
              />
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums text-muted-foreground">
              {p.v} {p.ch.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

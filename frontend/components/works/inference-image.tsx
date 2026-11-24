"use client"

import { Copy, ImageIcon, RotateCcw, Upload } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import { ConfidenceBar, RunPanel, useSimulatedRun } from "@/components/works/inference-shared"
import { DemoNote, StatusTag } from "@/components/works/primitives"
import type { Dataset, Model } from "@/lib/registry-data"
import { cn } from "@/lib/utils"
import { demoImageResult, type ImageInputSpec } from "@/lib/works/io-schema"

type Picked = { kind: "sample" | "file"; name: string; src: string }

const STAGES = ["이미지 형식 확인", "AI 입력 크기로 맞추기", "AI 실행", "결과 정리"]

const MAX_BYTES = 20 * 1024 * 1024

export function ImageInference({ model, dataset, spec }: { model: Model; dataset: Dataset; spec: ImageInputSpec }) {
  const [picked, setPicked] = useState<Picked | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const run = useSimulatedRun(STAGES)
  const result = demoImageResult(spec)

  useEffect(() => {
    return () => {
      if (picked?.kind === "file") URL.revokeObjectURL(picked.src)
    }
  }, [picked])

  const take = (file: File | undefined) => {
    if (!file) return
    const accepted = spec.accept.split(",")
    if (!accepted.includes(file.type)) {
      setError(`이 AI는 ${accepted.map((a) => a.replace("image/", "").toUpperCase()).join(", ")} 이미지만 받아요. 고른 파일: ${file.name}`)
      return
    }
    if (file.size > MAX_BYTES) {
      setError("20MB보다 큰 이미지는 데모에서 받을 수 없어요.")
      return
    }
    setError(null)
    setPicked({ kind: "file", name: file.name, src: URL.createObjectURL(file) })
    run.setReady(true)
  }

  const useSample = () => {
    setError(null)
    setPicked({ kind: "sample", name: `${dataset.name} 예시`, src: dataset.image })
    run.setReady(true)
  }

  const reset = () => {
    setPicked(null)
    run.reset()
  }

  const done = run.phase === "done"

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section aria-label={done ? "결과 이미지" : "입력 이미지"} className="flex flex-col gap-3">
        {picked ? (
          <div className="relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
            <div className="relative aspect-[4/3] w-full">
              {picked.kind === "sample" ? (
                <Image src={picked.src || "/placeholder.svg"} alt="예시 입력 이미지" fill sizes="60vw" className="object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={picked.src || "/placeholder.svg"} alt="내가 올린 입력 이미지" className="absolute inset-0 size-full object-contain" />
              )}
              {done && result.kind === "boxes"
                ? result.boxes.map((b) => (
                    <span
                      key={b.label}
                      className="absolute border-2 border-accent"
                      style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
                    >
                      <span className="absolute -top-7 left-0 whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">
                        {b.label} {Math.round(b.score * 100)}%
                      </span>
                    </span>
                  ))
                : null}
              {done && result.kind === "mask"
                ? result.regions.map((r) => (
                    <span
                      key={r.label}
                      className="absolute rounded-[40%] bg-destructive/45 ring-2 ring-destructive"
                      style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
                    />
                  ))
                : null}
              {run.phase === "running" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/55">
                  <p className="text-lg font-semibold text-background" aria-live="polite">
                    {STAGES[Math.min(run.stage, STAGES.length - 1)]} 중…
                  </p>
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
              <span className="truncate text-[15px] font-medium">
                {picked.kind === "sample" ? "예시 입력" : "내가 올린 이미지"} · {picked.name}
              </span>
              {run.phase === "ready" || done ? (
                <button type="button" onClick={reset} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <RotateCcw aria-hidden className="size-3.5" /> 다른 이미지
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
              take(e.dataTransfer.files[0])
            }}
            className={cn(
              "flex aspect-[4/3] flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed bg-card p-8 text-center transition-colors",
              dragging ? "border-primary bg-secondary" : "border-border",
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
              <Upload aria-hidden className="size-6" />
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-xl font-semibold">이미지를 여기로 끌어 놓으세요</p>
              <p className="text-[15px] text-muted-foreground">{spec.description}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-border bg-card px-5 py-3 text-[15px] font-semibold hover:bg-muted"
              >
                내 이미지 고르기
              </button>
              <button
                type="button"
                onClick={useSample}
                className="rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                예시 이미지로 해보기
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={spec.accept}
              className="sr-only"
              aria-label="입력 이미지 선택"
              onChange={(e) => take(e.target.files?.[0])}
            />
          </div>
        )}
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
            {error}
          </p>
        ) : null}
        {done && picked?.kind === "file" ? (
          <p className="text-sm text-muted-foreground">데모에서는 표시 위치가 내 이미지 내용과 관계없는 예시 좌표예요.</p>
        ) : null}
      </section>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        {done ? <ImageResult result={result} /> : (
          <RunPanel
            stages={STAGES}
            phase={run.phase}
            stage={run.stage}
            canRun={run.phase === "ready"}
            blockedReason="먼저 왼쪽에서 이미지를 골라 주세요."
            onRun={run.run}
          >
            <h2 className="text-lg font-semibold">이미지를 넣으면 이렇게 돌려줘요</h2>
            <ul className="flex flex-wrap gap-2">
              {model.outputs.map((o) => (
                <li key={o.name} className="flex flex-col rounded-md bg-muted px-2.5 py-1.5">
                  <span className="text-sm font-medium">{o.description}</span>
                  <span className="font-mono text-xs text-muted-foreground">{o.name} {o.shape}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              받는 형식: {spec.accept.split(",").map((a) => a.replace("image/", "").toUpperCase()).join(", ")} · 입력 텐서 {spec.tensorShape}
            </p>
          </RunPanel>
        )}
        <DemoNote>{done ? "예시 결과예요. 실제 모델을 실행한 값이 아닙니다." : "데모 환경이에요. 실제 모델을 실행하지 않고 예시 결과를 보여 줍니다."}</DemoNote>
      </aside>
    </div>
  )
}

function ImageResult({ result }: { result: ReturnType<typeof demoImageResult> }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => headingRef.current?.focus(), [])

  const heading =
    result.kind === "boxes"
      ? `결함으로 보이는 곳 ${result.boxes.length}군데를 찾았어요`
      : result.kind === "mask"
        ? `결함 영역 ${result.regions.length}곳을 칠해 표시했어요`
        : result.kind === "probs"
          ? `가장 가까운 유형은 '${result.probs[0]?.label}'이에요`
          : `글자 ${result.lines.length}줄을 읽었어요`

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border">
      <StatusTag tone="success">실행 완료</StatusTag>
      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-snug text-balance outline-none">
        {heading}
      </h2>

      {result.kind === "boxes" ? (
        <table className="w-full text-left text-[15px]">
          <caption className="sr-only">찾은 결함 위치</caption>
          <thead className="text-sm text-muted-foreground">
            <tr>
              <th scope="col" className="pb-2 font-medium">종류</th>
              <th scope="col" className="pb-2 font-medium">위치 (x, y, 너비, 높이 %)</th>
              <th scope="col" className="pb-2 text-right font-medium">확신</th>
            </tr>
          </thead>
          <tbody>
            {result.boxes.map((b) => (
              <tr key={b.label} className="border-t border-border">
                <td className="py-2 font-semibold">{b.label}</td>
                <td className="py-2 font-mono text-sm text-muted-foreground">{`${b.x}, ${b.y}, ${b.w}, ${b.h}`}</td>
                <td className="py-2 text-right tabular-nums">{Math.round(b.score * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {result.kind === "mask" ? (
        <ul className="flex flex-col gap-2">
          {result.regions.map((r) => (
            <li key={r.label} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5 text-[15px]">
              <span className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-sm bg-destructive/70" />
                <span className="font-semibold">{r.label}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">이미지 면적의 {r.areaPct}%</span>
            </li>
          ))}
        </ul>
      ) : null}

      {result.kind === "probs" ? (
        <ol className="flex flex-col gap-3">
          {result.probs.map((p, i) => (
            <li key={p.label} className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between text-[15px]">
                <span className={i === 0 ? "font-semibold" : undefined}>
                  {i + 1}. {p.label}
                </span>
                <span className="tabular-nums text-muted-foreground">{Math.round(p.p * 100)}%</span>
              </span>
              <ConfidenceBar value={p.p} />
            </li>
          ))}
        </ol>
      ) : null}

      {result.kind === "text" ? (
        <div className="flex flex-col gap-3">
          <ol className="flex flex-col divide-y divide-border rounded-xl bg-muted/40 font-mono text-sm">
            {result.lines.map((l) => (
              <li key={l.text} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className={l.confidence < 0.8 ? "text-warning-foreground" : undefined}>{l.text}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{Math.round(l.confidence * 100)}%</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result.lines.map((l) => l.text).join("\n"))
                setCopied(true)
              } catch {
                setCopied(false)
              }
            }}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Copy aria-hidden className="size-4" /> {copied ? "복사했어요" : "텍스트 복사"}
          </button>
        </div>
      ) : null}

      <p className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm leading-relaxed">
        <ImageIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        확신이 80% 미만인 항목은 사람이 한 번 더 확인하는 것이 좋아요.
      </p>
    </div>
  )
}

"use client"

import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { RunPanel, SpecTable, useSimulatedRun } from "@/components/works/inference-shared"
import { DemoNote, StatusTag } from "@/components/works/primitives"
import type { Model } from "@/lib/registry-data"
import { cn } from "@/lib/utils"
import {
  demoSeriesResult,
  parseSeriesCsv,
  sampleSeries,
  seriesToCsv,
  validateSeries,
  type SeriesInputSpec,
  type SeriesIssue,
  type SeriesRow,
} from "@/lib/works/io-schema"

const STAGES = ["열 이름·단위 확인", `시간 창 만들기`, "AI 실행", "결과 정리"]
const PREVIEW_ROWS = 8

type Source = "csv" | "paste" | "sample" | "sample-broken"

export function SeriesInference({ model, spec }: { model: Model; spec: SeriesInputSpec }) {
  const [rows, setRows] = useState<SeriesRow[] | null>(null)
  const [source, setSource] = useState<{ kind: Source; name: string } | null>(null)
  const [parseIssues, setParseIssues] = useState<SeriesIssue[]>([])
  const [paste, setPaste] = useState("")
  const [mode, setMode] = useState<"file" | "paste">("file")
  const fileRef = useRef<HTMLInputElement>(null)
  const run = useSimulatedRun(STAGES)

  const issues = useMemo(() => (rows ? [...parseIssues, ...validateSeries(rows, spec)] : parseIssues), [rows, parseIssues, spec])
  const valid = Boolean(rows) && issues.length === 0
  const windowRows = useMemo(() => (rows && valid ? rows.slice(-spec.windowLength) : []), [rows, valid, spec.windowLength])
  const result = useMemo(() => (valid ? demoSeriesResult(windowRows, spec) : null), [valid, windowRows, spec])

  useEffect(() => {
    run.setReady(valid)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to validity
  }, [valid])

  const load = (next: SeriesRow[], kind: Source, name: string, extra: SeriesIssue[] = []) => {
    setRows(next)
    setSource({ kind, name })
    setParseIssues(extra)
    run.reset()
  }

  const readCsv = async (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setRows(null)
      setSource({ kind: "csv", name: file.name })
      setParseIssues([{ message: `.csv 파일만 받을 수 있어요. 고른 파일: ${file.name}` }])
      return
    }
    const parsed = parseSeriesCsv(await file.text(), spec)
    load(parsed.rows, "csv", file.name, parsed.issues)
  }

  const useSample = (broken: boolean) => {
    const base = sampleSeries(spec)
    if (broken) {
      const copy = base.slice(0, spec.windowLength - 16).map((r) => ({ ...r, values: { ...r.values } }))
      copy[12].values[spec.channels[0].name] = null
      copy[40].values[spec.channels[1].name] = 999
      load(copy, "sample-broken", "오류가 섞인 예시")
    } else {
      load(base, "sample", `예시 센서 기록 ${spec.windowLength}줄`)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([seriesToCsv(sampleSeries(spec, false).slice(0, 3), spec)], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${model.id}-input-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setRows(null)
    setSource(null)
    setParseIssues([])
    run.reset()
  }

  const done = run.phase === "done" && result

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="spec-title" className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <h2 id="spec-title" className="text-lg font-semibold">이 AI가 받는 값</h2>
            <p className="text-[15px] text-muted-foreground">
              한 줄이 아니라 <strong className="font-semibold text-foreground">연속된 {spec.windowLength}줄</strong>(시간 창)을 한 번에 넣어야 해요. 줄마다
              아래 {spec.channels.length}개 값이 필요해요.
            </p>
          </div>
          <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 self-start rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
            <Download aria-hidden className="size-4" /> CSV 양식 받기
          </button>
        </div>
        <SpecTable
          rows={[
            { name: spec.timestamp.name, label: "측정 시각", required: false, rule: "HH:MM:SS 또는 ISO 8601", demo: true },
            ...spec.channels.map((c) => ({
              name: c.name,
              label: c.label,
              unit: c.unit,
              required: c.required,
              rule: `숫자 · ${c.range.min}–${c.range.max}`,
              demo: true,
            })),
          ]}
        />
        <p className="text-sm text-muted-foreground">
          열 이름·단위·필수 여부는 연결된 데이터셋 스키마에서, 줄 수({spec.windowLength})는 입력 텐서 {spec.tensorShape}에서 가져왔어요. 허용 범위와 timestamp
          열은 레지스트리에 없어 데모 값으로 표시했어요.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="입력 데이터" className="flex flex-col gap-4">
          {!rows && !parseIssues.length ? (
            <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-border bg-card p-6">
              <div role="tablist" aria-label="넣는 방법" className="flex gap-1 self-start rounded-lg bg-muted p-1">
                {(["file", "paste"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    type="button"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={cn("rounded-md px-3 py-1.5 text-sm font-medium", mode === m ? "bg-card shadow-sm" : "text-muted-foreground")}
                  >
                    {m === "file" ? "CSV 파일 올리기" : "값 붙여 넣기"}
                  </button>
                ))}
              </div>
              {mode === "file" ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <FileSpreadsheet aria-hidden className="size-9 text-primary" />
                  <p className="text-lg font-semibold">센서 기록 CSV를 올려 주세요</p>
                  <p className="text-[15px] text-muted-foreground">
                    {spec.channels.map((c) => c.name).join(", ")} 열이 있어야 해요. 줄이 더 많으면 마지막 {spec.windowLength}줄을 써요.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-[15px] font-semibold hover:bg-muted"
                  >
                    <Upload aria-hidden className="size-4" /> CSV 고르기
                  </button>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="CSV 파일 선택" onChange={(e) => readCsv(e.target.files?.[0])} />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <label htmlFor="paste" className="text-[15px] font-medium">
                    첫 줄은 열 이름, 다음 줄부터 값 (쉼표로 구분)
                  </label>
                  <textarea
                    id="paste"
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    rows={7}
                    placeholder={`timestamp,${spec.channels.map((c) => c.name).join(",")}\n09:00:00,62.1,4.3,18.2`}
                    className="rounded-lg border border-input bg-background p-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    disabled={!paste.trim()}
                    onClick={() => {
                      const parsed = parseSeriesCsv(paste, spec)
                      load(parsed.rows, "paste", "붙여 넣은 값", parsed.issues)
                    }}
                    className="self-start rounded-lg bg-primary px-4 py-2.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                  >
                    값 확인하기
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4 text-[15px]">
                <span className="text-muted-foreground">파일이 없다면</span>
                <button type="button" onClick={() => useSample(false)} className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
                  예시 기록으로 해보기
                </button>
                <button type="button" onClick={() => useSample(true)} className="font-medium text-primary hover:underline">
                  오류가 섞인 예시 보기
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">넣은 데이터</span>
                  <span className="text-base font-semibold">
                    {source?.name} · {rows?.length ?? 0}줄
                  </span>
                </div>
                {run.phase !== "running" ? (
                  <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <RotateCcw aria-hidden className="size-3.5" /> 다른 데이터
                  </button>
                ) : null}
              </div>

              {issues.length ? (
                <div role="alert" className="flex flex-col gap-2 rounded-xl bg-destructive/10 p-4 text-destructive">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle aria-hidden className="size-4" /> 실행 전에 고쳐야 할 곳이 {issues.length}개 있어요
                  </p>
                  <ul className="flex flex-col gap-1 text-[15px]">
                    {issues.slice(0, 5).map((i) => (
                      <li key={i.message}>{i.message}</li>
                    ))}
                    {issues.length > 5 ? <li>외 {issues.length - 5}개</li> : null}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-[15px] text-success">
                  <CheckCircle2 aria-hidden className="size-4" /> 필수 열·줄 수·값 범위를 모두 통과했어요
                </p>
              )}

              {rows?.length ? (
                <>
                  <SeriesChart rows={done ? windowRows : rows} spec={spec} highlight={done ? result.window : undefined} />
                  <PreviewTable rows={rows} spec={spec} issues={issues} />
                </>
              ) : null}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {done ? (
            <SeriesResult model={model} spec={spec} result={result} rows={windowRows} />
          ) : (
            <RunPanel
              stages={STAGES}
              phase={run.phase}
              stage={run.stage}
              canRun={valid && run.phase === "ready"}
              blockedReason={rows ? "표시된 오류를 먼저 고쳐 주세요." : "먼저 센서 기록을 넣어 주세요."}
              onRun={run.run}
            >
              <h2 className="text-lg font-semibold">실행하면 이렇게 돌려줘요</h2>
              <ul className="flex flex-col gap-2">
                {model.outputs.map((o) => (
                  <li key={o.name} className="flex items-baseline justify-between gap-3 rounded-md bg-muted px-3 py-2">
                    <span className="text-[15px] font-medium">{o.description}</span>
                    <span className="font-mono text-xs text-muted-foreground">{o.name}</span>
                  </li>
                ))}
              </ul>
            </RunPanel>
          )}
          <DemoNote>{done ? "예시 결과예요. 실제 모델을 실행한 값이 아니라, 넣은 값의 진동 변화로 흉내 낸 결과입니다." : "데모 환경이에요. 값 검사는 실제로 하고, AI 실행은 흉내 냅니다."}</DemoNote>
        </aside>
      </div>
    </div>
  )
}

function PreviewTable({ rows, spec, issues }: { rows: SeriesRow[]; spec: SeriesInputSpec; issues: SeriesIssue[] }) {
  const bad = new Set(issues.filter((i) => i.row).map((i) => `${i.row}:${i.column}`))
  const firstBad = issues.find((i) => i.row)?.row
  const start = firstBad ? Math.max(0, firstBad - 3) : 0
  const view = rows.slice(start, start + PREVIEW_ROWS)
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl ring-1 ring-border">
        <table className="w-full text-right font-mono text-sm tabular-nums">
          <caption className="sr-only">입력 값 미리보기</caption>
          <thead className="bg-muted/60 font-sans text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">#</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">timestamp</th>
              {spec.channels.map((c) => (
                <th key={c.name} scope="col" className="px-3 py-2 font-medium">
                  {c.label} ({c.unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => {
              const n = start + i + 1
              return (
                <tr key={n} className="border-t border-border">
                  <td className="px-3 py-1.5 text-left text-muted-foreground">{n}</td>
                  <td className="px-3 py-1.5 text-left">{r.timestamp ?? "-"}</td>
                  {spec.channels.map((c) => (
                    <td key={c.name} className={cn("px-3 py-1.5", bad.has(`${n}:${c.name}`) && "bg-destructive/15 font-semibold text-destructive")}>
                      {r.values[c.name] ?? "비어 있음"}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        {rows.length}줄 중 {start + 1}–{Math.min(rows.length, start + PREVIEW_ROWS)}번째 줄{firstBad ? " (첫 오류 위치)" : ""}
      </p>
    </div>
  )
}

const CHART_W = 600
const CHART_H = 56

function SeriesChart({ rows, spec, highlight }: { rows: SeriesRow[]; spec: SeriesInputSpec; highlight?: [number, number] }) {
  return (
    <figure className="flex flex-col gap-3">
      {spec.channels.map((c) => {
        const vals = rows.map((r) => r.values[c.name]).filter((v): v is number => typeof v === "number" && Number.isFinite(v))
        if (!vals.length) return null
        const min = Math.min(...vals)
        const max = Math.max(...vals)
        const span = max - min || 1
        const pts = rows
          .map((r, i) => {
            const v = r.values[c.name]
            if (typeof v !== "number" || !Number.isFinite(v)) return null
            const x = (i / Math.max(rows.length - 1, 1)) * CHART_W
            const y = CHART_H - ((Math.min(Math.max(v, min), max) - min) / span) * (CHART_H - 6) - 3
            return `${x.toFixed(1)},${y.toFixed(1)}`
          })
          .filter(Boolean)
          .join(" ")
        return (
          <div key={c.name} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm">
              {c.label}
              <span className="block text-xs text-muted-foreground">
                {min.toFixed(1)}–{max.toFixed(1)} {c.unit}
              </span>
            </span>
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="h-14 w-full rounded-md bg-muted/50" aria-hidden>
              {highlight ? (
                <rect
                  x={(highlight[0] / Math.max(rows.length - 1, 1)) * CHART_W}
                  width={((highlight[1] - highlight[0]) / Math.max(rows.length - 1, 1)) * CHART_W}
                  y={0}
                  height={CHART_H}
                  className="fill-destructive/20"
                />
              ) : null}
              <polyline points={pts} fill="none" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="stroke-primary" />
            </svg>
          </div>
        )
      })}
      <figcaption className="sr-only">채널별 값 추이</figcaption>
    </figure>
  )
}

function SeriesResult({
  model,
  spec,
  result,
  rows,
}: {
  model: Model
  spec: SeriesInputSpec
  result: NonNullable<ReturnType<typeof demoSeriesResult>>
  rows: SeriesRow[]
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])
  const has = (name: string) => model.outputs.some((o) => o.name === name)
  const from = rows[result.window[0]]?.timestamp
  const to = rows[result.window[1]]?.timestamp

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border">
      <StatusTag tone={result.anomalous ? "danger" : "success"}>{result.anomalous ? "이상 신호 있음" : "정상 범위"}</StatusTag>
      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-snug text-balance outline-none">
        {result.anomalous ? `${from}–${to} 구간에서 평소와 다른 움직임이 보여요` : "이 시간 창에서는 이상 신호가 없어요"}
      </h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {has("anomaly_score") ? (
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
            <dt className="text-sm text-muted-foreground">이상 점수 (0–1)</dt>
            <dd className="text-3xl font-bold tabular-nums">{result.score.toFixed(2)}</dd>
            <dd className="text-xs text-muted-foreground">기준 {spec.threshold.value} 이상이면 이상 (데모 기준)</dd>
          </div>
        ) : null}
        {has("fault_type") ? (
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
            <dt className="text-sm text-muted-foreground">이상 유형</dt>
            <dd className="text-xl font-bold">{result.faultType}</dd>
            <dd className="text-xs text-muted-foreground">데이터셋 라벨 {spec.faultLabels.length}종 중</dd>
          </div>
        ) : null}
        {has("rul_days") ? (
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
            <dt className="text-sm text-muted-foreground">추정 잔여 수명</dt>
            <dd className="text-3xl font-bold tabular-nums">
              {result.rulDays}
              <span className="ml-1 text-base font-medium">일</span>
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        왼쪽 그래프에서 붉게 칠한 구간이 AI가 주목한 시점이에요. 점수가 높게 나오면 해당 시각의 설비 상태를 현장에서 확인해 보세요.
      </p>
    </div>
  )
}

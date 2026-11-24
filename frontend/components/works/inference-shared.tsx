"use client"

import { Check, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export type RunPhase = "empty" | "ready" | "running" | "done"

const STAGE_MS = 800

/** Simulated run: walks through stage labels, then reports done. */
export function useSimulatedRun(stages: string[]) {
  const [phase, setPhase] = useState<RunPhase>("empty")
  const [stage, setStage] = useState(0)

  useEffect(() => {
    if (phase !== "running") return
    if (stage >= stages.length) {
      setPhase("done")
      return
    }
    const t = setTimeout(() => setStage((s) => s + 1), STAGE_MS)
    return () => clearTimeout(t)
  }, [phase, stage, stages.length])

  return {
    phase,
    stage,
    setReady: (ready: boolean) => setPhase(ready ? "ready" : "empty"),
    run: () => {
      setStage(0)
      setPhase("running")
    },
    reset: () => {
      setStage(0)
      setPhase("empty")
    },
  }
}

export function RunPanel({
  stages,
  phase,
  stage,
  canRun,
  blockedReason,
  onRun,
  children,
}: {
  stages: string[]
  phase: RunPhase
  stage: number
  canRun: boolean
  blockedReason?: string
  onRun: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border">
      {children}
      <button
        type="button"
        onClick={onRun}
        disabled={!canRun || phase === "running"}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent text-base font-semibold text-accent-foreground transition-colors hover:bg-accent/85 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      >
        {phase === "running" ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" /> 실행 중
          </>
        ) : (
          "AI 실행하기"
        )}
      </button>
      {!canRun && phase !== "running" && blockedReason ? <p className="text-sm text-muted-foreground">{blockedReason}</p> : null}
      {phase === "running" ? (
        <ol className="flex flex-col gap-2" aria-label="실행 진행" aria-live="polite">
          {stages.map((s, i) => (
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
  )
}

export function ConfidenceBar({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("block h-2 overflow-hidden rounded-full bg-muted", className)}>
      <span
        className={cn("block h-full rounded-full", value >= 0.8 ? "bg-primary" : "bg-warning")}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </span>
  )
}

/** Field-level spec row: name, unit, required, range. */
export function SpecTable({
  rows,
}: {
  rows: { name: string; label: string; unit?: string; required: boolean; rule: string; demo?: boolean }[]
}) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">열 이름</th>
            <th scope="col" className="px-3 py-2 font-medium">의미</th>
            <th scope="col" className="px-3 py-2 font-medium">단위</th>
            <th scope="col" className="px-3 py-2 font-medium">필수</th>
            <th scope="col" className="px-3 py-2 font-medium">허용 범위·형식</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-border">
              <td className="px-3 py-2 font-mono text-[13px]">{r.name}</td>
              <td className="px-3 py-2">{r.label}</td>
              <td className="px-3 py-2">{r.unit ?? "-"}</td>
              <td className="px-3 py-2">{r.required ? "필수" : "선택"}</td>
              <td className="px-3 py-2">
                {r.rule}
                {r.demo ? <span className="ml-1.5 rounded bg-warning/18 px-1.5 py-0.5 text-xs text-warning-foreground">데모 값</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

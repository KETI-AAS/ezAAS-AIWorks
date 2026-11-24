"use client"

import { FlaskConical } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { HUB_INSTANCES, INITIAL_STATES, listStatus, STATUS_LABEL, type AssetState, type ListStatus } from "./data"
import { InstanceBrowser } from "./instance-browser"
import { InstanceInspector } from "./instance-inspector"
import { StatusMark } from "./status-mark"
import { TopNav } from "./top-nav"

const STEP_MS = 1100
const SUMMARY_ORDER: ListStatus[] = ["needs-file", "ready", "validating", "passed", "failed"]

export function RegisterScreen() {
  const [states, setStates] = useState<Record<string, AssetState>>(INITIAL_STATES)
  const [selectedId, setSelectedId] = useState(HUB_INSTANCES[0].id)
  const instance = HUB_INSTANCES.find((i) => i.id === selectedId) ?? HUB_INSTANCES[0]

  const patch = (id: string, next: Partial<AssetState>) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }))

  const validatingKey = Object.entries(states)
    .filter(([, s]) => s.phase === "validating")
    .map(([id, s]) => `${id}:${s.step}`)
    .join("|")

  useEffect(() => {
    if (!validatingKey) return
    const timer = setTimeout(() => {
      setStates((prev) => {
        const next = { ...prev }
        for (const inst of HUB_INSTANCES) {
          const s = prev[inst.id]
          if (s.phase !== "validating") continue
          if (s.outcome === "fail" && s.step === inst.failure.check) {
            next[inst.id] = { ...s, phase: "failed" }
          } else if (s.step + 1 >= inst.checks.length) {
            next[inst.id] = { ...s, phase: "passed", step: inst.checks.length }
          } else {
            next[inst.id] = { ...s, step: s.step + 1 }
          }
        }
        return next
      })
    }, STEP_MS)
    return () => clearTimeout(timer)
  }, [validatingKey])

  const summary = useMemo(() => {
    const counts = Object.fromEntries(SUMMARY_ORDER.map((k) => [k, 0])) as Record<ListStatus, number>
    for (const s of Object.values(states)) counts[listStatus(s)] += 1
    return counts
  }, [states])

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopNav active="/v2/register" />

      <div className="flex flex-col gap-6 border-b border-border px-6 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">내 AI 자산 준비하기</h1>
          <p className="leading-relaxed text-muted-foreground text-pretty">
            Model Hub에 올린 instance를 고르고, 그 instance가 가리키는 실제 파일을 연결해 등록하세요. 등록된 파일은
            자동으로 검증됩니다.
          </p>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-warning/50 px-2.5 py-0.5 text-xs text-warning lg:self-end">
            <FlaskConical className="size-3.5" aria-hidden />
            데모 데이터 · 실제 서버 처리 없음
          </span>
          <ul aria-label="등록 현황" className="flex flex-wrap gap-x-5 gap-y-1">
            {SUMMARY_ORDER.map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <StatusMark status={k} className="text-xs" />
                <span className="font-mono text-sm font-semibold" aria-label={`${STATUS_LABEL[k]} ${summary[k]}개`}>
                  {summary[k]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <main className="grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,34rem)] xl:grid-cols-[minmax(0,1fr)_minmax(460px,38%)]">
        <div className="px-6 py-6 lg:px-10">
          <InstanceBrowser
            instances={HUB_INSTANCES}
            states={states}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <InstanceInspector
          key={instance.id}
          instance={instance}
          state={states[instance.id]}
          onAttach={(file) => patch(instance.id, { file })}
          onOutcome={(outcome) => patch(instance.id, { outcome })}
          onRegister={() => patch(instance.id, { phase: "validating", step: 0 })}
          onReplaceFile={() => patch(instance.id, { phase: "draft", step: 0, file: null, outcome: "pass" })}
        />
      </main>
    </div>
  )
}

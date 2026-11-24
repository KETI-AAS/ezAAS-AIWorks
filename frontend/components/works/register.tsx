"use client"

import { AlertTriangle, Boxes, Check, CheckCircle2, Database, FileUp, Layers, Loader2, RotateCcw, Search, X } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import { DemoNote, KeyValues, NextAction, StatusTag, TechDetails, type Tone } from "@/components/works/primitives"
import { cn } from "@/lib/utils"
import {
  BACKEND_GAP,
  checksOf,
  formatSize,
  HUB_INSTANCES,
  INITIAL_STATES,
  KIND_LABEL,
  listStatus,
  missingSlots,
  slotsOf,
  type AssetState,
  type AttachedFile,
  type FileExt,
  type FileSlot,
  type HubInstance,
  type ListStatus,
} from "@/lib/works/hub-instances"

const STEP_MS = 900

const LIST_META: Record<ListStatus, { label: string; tone: Tone }> = {
  "needs-file": { label: "파일을 올려 주세요", tone: "warning" },
  ready: { label: "등록할 수 있어요", tone: "progress" },
  validating: { label: "검증 중", tone: "progress" },
  passed: { label: "사용 가능", tone: "success" },
  failed: { label: "확인이 필요해요", tone: "danger" },
}

const GROUPS: { title: string; statuses: ListStatus[] }[] = [
  { title: "할 일이 있어요", statuses: ["needs-file", "ready", "failed"] },
  { title: "진행 중", statuses: ["validating"] },
  { title: "사용 가능", statuses: ["passed"] },
]

const KIND_ICON = { model: Boxes, dataset: Database, combined: Layers }

export function Register() {
  const [states, setStates] = useState<Record<string, AssetState>>(INITIAL_STATES)
  const [selectedId, setSelectedId] = useState("weld-qc-bundle")
  const [query, setQuery] = useState("")
  const instance = HUB_INSTANCES.find((i) => i.id === selectedId) ?? HUB_INSTANCES[0]

  const patch = (id: string, next: Partial<AssetState>) => setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }))

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
          const total = checksOf(inst).length
          if (s.outcome === "fail" && s.step === inst.failure.check) next[inst.id] = { ...s, phase: "failed" }
          else if (s.step + 1 >= total) next[inst.id] = { ...s, phase: "passed", step: total }
          else next[inst.id] = { ...s, step: s.step + 1 }
        }
        return next
      })
    }, STEP_MS)
    return () => clearTimeout(timer)
  }, [validatingKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HUB_INSTANCES
    return HUB_INSTANCES.filter((i) => i.name.toLowerCase().includes(q) || i.hubId.toLowerCase().includes(q))
  }, [query])

  const todoCount = HUB_INSTANCES.filter((i) => ["needs-file", "ready", "failed"].includes(listStatus(i, states[i.id]))).length

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-[15px] font-medium text-primary">자산 등록</p>
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
            Model Hub에 올린 AI를
            <br className="hidden md:block" /> 여기서 쓸 수 있게 준비해요
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
            {todoCount > 0 ? `할 일이 있는 자산이 ${todoCount}개 있어요. ` : ""}고른 항목이 요구하는 실제 파일을 모두 올려 등록하면, 파일이 제대로 동작하는지 자동으로
            확인해요.
          </p>
        </div>
        <ol aria-label="등록 순서" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[640px]">
          {[
            { t: "Model Hub 로그인", done: true },
            { t: `내 instance 불러오기 · ${HUB_INSTANCES.length}개`, done: true },
            { t: "필요한 파일 올리고 등록", done: false },
            { t: "자동 검증 후 사용", done: false },
          ].map((s, i) => (
            <li key={s.t} className="flex flex-col gap-1 rounded-xl bg-card p-3 ring-1 ring-border">
              <span className={cn("flex items-center gap-1 text-sm font-semibold tabular-nums", s.done ? "text-success" : "text-primary")}>
                {s.done ? <Check aria-hidden className="size-3.5" /> : null}
                {i + 1}단계
              </span>
              <span className="text-[15px] font-medium leading-snug">{s.t}</span>
            </li>
          ))}
        </ol>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <nav aria-label="내 Model Hub 항목" className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <label className="relative">
            <span className="sr-only">이름으로 찾기</span>
            <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 또는 instance ID"
              className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {GROUPS.map((g) => {
            const items = filtered.filter((i) => g.statuses.includes(listStatus(i, states[i.id])))
            if (items.length === 0) return null
            return (
              <div key={g.title} className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {g.title} <span className="tabular-nums">{items.length}</span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {items.map((i) => {
                    const status = listStatus(i, states[i.id])
                    const selected = i.id === selectedId
                    const Icon = KIND_ICON[i.kind]
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(i.id)}
                          aria-current={selected ? "true" : undefined}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl p-4 text-left ring-1 transition-colors",
                            selected ? "bg-card ring-2 ring-primary" : "bg-card/60 ring-border hover:bg-card",
                          )}
                        >
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon aria-hidden className="size-4" />
                          </span>
                          <span className="flex min-w-0 flex-col gap-1.5">
                            <span className="text-base font-semibold leading-snug">{i.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {KIND_LABEL[i.kind]} · {slotsOf(i).map((s) => s.ext).join(" + ")} 필요
                            </span>
                            <span className="flex flex-wrap gap-1.5">
                              <StatusTag tone={LIST_META[status].tone}>{LIST_META[status].label}</StatusTag>
                              {i.demoOnly ? (
                                <span className="rounded-full border border-dashed border-warning px-2 py-0.5 text-xs text-warning-foreground">UI 데모</span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
          {filtered.length === 0 ? <p className="text-[15px] text-muted-foreground">찾는 이름이 없어요.</p> : null}
          <p className="text-sm leading-relaxed text-muted-foreground">Model Hub에서 내가 올린 instance만 보여요.</p>
        </nav>

        <Workspace
          key={instance.id}
          instance={instance}
          state={states[instance.id]}
          onAttach={(ext, file) => {
            const files = { ...states[instance.id].files }
            if (file) files[ext] = file
            else delete files[ext]
            patch(instance.id, { files })
          }}
          onOutcome={(outcome) => patch(instance.id, { outcome })}
          onRegister={() => patch(instance.id, { phase: "validating", step: 0 })}
          onRetry={(ext) => {
            const files = { ...states[instance.id].files }
            delete files[ext]
            patch(instance.id, { phase: "draft", step: 0, files, outcome: "pass" })
          }}
        />
      </div>
    </div>
  )
}

type WorkspaceProps = {
  instance: HubInstance
  state: AssetState
  onAttach: (ext: FileExt, file: AttachedFile | null) => void
  onOutcome: (outcome: AssetState["outcome"]) => void
  onRegister: () => void
  onRetry: (ext: FileExt) => void
}

function Workspace({ instance, state, onAttach, onOutcome, onRegister, onRetry }: WorkspaceProps) {
  const registered = state.phase !== "draft"
  const headingRef = useRef<HTMLHeadingElement>(null)
  const checks = checksOf(instance)
  const failedExt = state.phase === "failed" ? checks[state.step]?.ext : undefined

  useEffect(() => {
    if (state.phase === "passed" || state.phase === "failed") headingRef.current?.focus()
  }, [state.phase])

  return (
    <section aria-labelledby="ws-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-medium">{KIND_LABEL[instance.kind]}</span>
          <StageTrack state={state} />
        </div>
        <h2 id="ws-title" className="text-3xl font-bold tracking-tight text-balance">
          {instance.name}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-pretty">{instance.purpose}</p>
        {instance.demoOnly ? (
          <DemoNote>
            모델과 데이터 파일을 함께 요구하는 instance는 UI 데모예요. 현재 서버는 instance 하나에 파일 하나만 등록합니다. 아래 “백엔드에 필요한 변경”을 확인해 주세요.
          </DemoNote>
        ) : null}
      </div>

      {!registered ? (
        <RegisterForm instance={instance} state={state} onAttach={onAttach} onOutcome={onOutcome} onRegister={onRegister} />
      ) : state.phase === "validating" ? (
        <Validating instance={instance} state={state} />
      ) : state.phase === "passed" ? (
        <>
          <div className="flex flex-col gap-4 rounded-2xl bg-success/10 p-6 md:flex-row md:items-center md:gap-6 md:p-8">
            <CheckCircle2 aria-hidden className="size-12 shrink-0 text-success" />
            <div className="flex flex-col gap-1.5">
              <h3 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
                검증까지 끝났어요. 이제 사용할 수 있어요
              </h3>
              <p className="text-[15px] leading-relaxed">
                올린 파일 {Object.keys(state.files).length}개가 {checks.length}가지 확인을 모두 통과했어요.
              </p>
              <p className="text-sm text-muted-foreground">“형식이 맞다”는 뜻이에요. 우리 데이터에서 얼마나 잘 맞는지는 추론으로 직접 확인해 보세요.</p>
            </div>
          </div>
          <NextAction
            title={instance.kind === "dataset" ? "이 데이터를 쓰는 AI를 볼까요?" : "이 AI에 직접 넣어 볼까요?"}
            primary={
              instance.link
                ? { href: instance.kind === "dataset" ? instance.link.href : `${instance.link.href}/deploy`, label: instance.kind === "dataset" ? "데이터셋 보기" : "추론 해보기" }
                : { href: "/models", label: "AI 찾아보기에서 보기" }
            }
            secondary={instance.link && instance.kind !== "dataset" ? instance.link : undefined}
          />
          <ValidationBySlot instance={instance} state={state} />
        </>
      ) : (
        <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-2 ring-destructive/40 md:p-8">
          <div className="flex items-start gap-4">
            <AlertTriangle aria-hidden className="mt-1 size-7 shrink-0 text-destructive" />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">등록은 됐지만 검증에서 멈췄어요</p>
              <h3 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
                {instance.failure.title}
              </h3>
              <p className="text-[15px] leading-relaxed">{instance.failure.detail}</p>
            </div>
          </div>
          {failedExt ? (
            <button
              type="button"
              onClick={() => onRetry(failedExt)}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <RotateCcw aria-hidden className="size-4" /> {failedExt} 파일만 바꿔서 다시 올리기
            </button>
          ) : null}
          <ValidationBySlot instance={instance} state={state} />
        </div>
      )}

      <TechDetails title="Model Hub 항목 정보 (기술 정보)" hint="instance ID, 형식, 업로드 날짜">
        <KeyValues
          items={[
            { label: "instance ID", value: instance.hubId },
            ...instance.meta,
            { label: "Model Hub 업로드", value: instance.uploadedAt },
            ...Object.entries(state.files).map(([ext, f]) => ({ label: `연결한 파일 (${ext})`, value: `${f!.name} · ${formatSize(f!.size)}` })),
          ]}
        />
      </TechDetails>

      {instance.demoOnly ? (
        <TechDetails title="백엔드에 필요한 변경" hint="결합 instance를 실제로 지원하려면" defaultOpen>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
            {BACKEND_GAP.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </TechDetails>
      ) : null}
    </section>
  )
}

function StageTrack({ state }: { state: AssetState }) {
  const regDone = state.phase !== "draft"
  const val: { label: string; tone: Tone } =
    state.phase === "passed"
      ? { label: "검증 완료", tone: "success" }
      : state.phase === "failed"
        ? { label: "검증 실패", tone: "danger" }
        : state.phase === "validating"
          ? { label: "검증 중", tone: "progress" }
          : { label: "검증 전", tone: "neutral" }
  return (
    <span className="flex items-center gap-2" aria-label="진행 상태">
      <StatusTag tone={regDone ? "success" : "neutral"}>{regDone ? "등록 완료" : "등록 전"}</StatusTag>
      <span aria-hidden className="text-muted-foreground">
        →
      </span>
      <StatusTag tone={val.tone}>{val.label}</StatusTag>
    </span>
  )
}

function RegisterForm({ instance, state, onAttach, onOutcome, onRegister }: Pick<WorkspaceProps, "instance" | "state" | "onAttach" | "onOutcome" | "onRegister">) {
  const slots = slotsOf(instance)
  const missing = missingSlots(instance, state)

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold">등록하려면 {slots.length + 1}가지가 필요해요</h3>
        <p className="text-[15px] text-muted-foreground">모두 준비되면 등록 버튼이 켜져요.</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-[15px]">
        <Check aria-hidden className="size-4 text-success" />
        <span className="font-semibold text-success">Model Hub instance · 준비됨</span>
        <span className="truncate text-muted-foreground">{instance.hubId}</span>
      </div>

      <div className={cn("grid gap-4", slots.length > 1 && "md:grid-cols-2")}>
        {slots.map((s) => (
          <FileSlotCard key={s.ext} slot={s} file={state.files[s.ext]} onAttach={(f) => onAttach(s.ext, f)} />
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
        <fieldset className="flex flex-wrap items-center gap-3 text-sm">
          <legend className="sr-only">데모 검증 결과 고르기</legend>
          <span className="text-muted-foreground">데모 검증 결과</span>
          {(["pass", "fail"] as const).map((o) => (
            <label key={o} className="flex items-center gap-1.5">
              <input type="radio" name={`outcome-${instance.id}`} checked={state.outcome === o} onChange={() => onOutcome(o)} />
              {o === "pass" ? "통과" : "실패"}
            </label>
          ))}
        </fieldset>
        <button
          type="button"
          disabled={missing.length > 0}
          onClick={onRegister}
          className="h-12 rounded-lg bg-accent px-6 text-base font-semibold text-accent-foreground hover:bg-accent/85 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {missing.length ? `${missing.map((m) => m.ext).join(", ")} 파일을 먼저 올려 주세요` : "등록하고 검증 시작"}
        </button>
      </div>
      <DemoNote>데모 환경이에요. 파일은 서버로 보내지지 않고, 검증은 정해진 순서로 흉내 냅니다.</DemoNote>
    </div>
  )
}

function FileSlotCard({ slot, file, onAttach }: { slot: FileSlot; file?: AttachedFile; onAttach: (f: AttachedFile | null) => void }) {
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const take = (f: File | undefined) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith(slot.ext)) {
      setError(`${slot.ext} 파일만 올릴 수 있어요. 고른 파일: ${f.name}`)
      return
    }
    setError(null)
    onAttach({ name: f.name, size: f.size })
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl p-5",
        file ? "bg-success/10" : error ? "border-2 border-destructive/60 bg-destructive/5" : "border-2 border-dashed border-warning bg-warning/10",
      )}
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
    >
      <span className={cn("flex items-center gap-2 text-[15px] font-semibold", file ? "text-success" : "text-warning-foreground")}>
        {file ? <Check aria-hidden className="size-4" /> : <FileUp aria-hidden className="size-4" />}
        {slot.label} ({slot.ext}) · {file ? "올림" : "필요해요"}
      </span>
      {file ? (
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold">{file.name}</span>
            <span className="text-sm text-muted-foreground">{formatSize(file.size)}</span>
          </span>
          <button type="button" onClick={() => onAttach(null)} aria-label={`${slot.ext} 파일 빼기`} className="rounded-md p-2 hover:bg-card">
            <X aria-hidden className="size-4" />
          </button>
        </span>
      ) : (
        <>
          <p className="text-[15px] leading-relaxed">{slot.hint}</p>
          <p className={cn("text-sm", dragging ? "font-semibold text-primary" : "text-muted-foreground")}>
            {dragging ? "여기에 놓으세요" : `${slot.ext} 파일을 끌어 놓거나 고르세요`}
          </p>
          <div className="flex flex-wrap gap-2">
            <label htmlFor={inputId} className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2.5 text-[15px] font-semibold hover:bg-muted">
              내 컴퓨터에서 고르기
            </label>
            <button
              type="button"
              onClick={() => {
                setError(null)
                onAttach({ name: slot.sampleName, size: slot.sampleSize })
              }}
              className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-primary hover:underline"
            >
              예시 파일로 해보기
            </button>
            <input id={inputId} type="file" accept={slot.ext} className="sr-only" onChange={(e) => take(e.target.files?.[0])} />
          </div>
        </>
      )}
      {error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle aria-hidden className="size-4 shrink-0" /> {error}
        </p>
      ) : null}
    </div>
  )
}

function Validating({ instance, state }: { instance: HubInstance; state: AssetState }) {
  const checks = checksOf(instance)
  const pct = Math.round((state.step / checks.length) * 100)
  const cur = checks[Math.min(state.step, checks.length - 1)]
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8" aria-live="polite">
      <div className="flex items-center gap-4">
        <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-success">등록 완료 · 이제 파일을 확인하고 있어요</p>
          <h3 className="text-2xl font-bold">
            {cur.ext} · {cur.name} 확인 중 ({state.step + 1}/{checks.length})
          </h3>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.max(pct, 6)}%` }} />
      </div>
      <ValidationBySlot instance={instance} state={state} />
      <p className="text-[15px] text-muted-foreground">다른 항목을 보고 와도 검증은 계속 진행돼요.</p>
    </div>
  )
}

/** Separate validation result per uploaded file. */
function ValidationBySlot({ instance, state }: { instance: HubInstance; state: AssetState }) {
  const slots = slotsOf(instance)
  let offset = 0
  return (
    <div className={cn("grid gap-4", slots.length > 1 && "md:grid-cols-2")}>
      {slots.map((slot) => {
        const base = offset
        offset += slot.checks.length
        const end = base + slot.checks.length
        const slotFailed = state.phase === "failed" && state.step >= base && state.step < end
        const slotPassed = state.phase === "passed" || state.step >= end
        const tone: Tone = slotFailed ? "danger" : slotPassed ? "success" : state.phase === "validating" && state.step >= base ? "progress" : "neutral"
        const label = slotFailed ? "검증 실패" : slotPassed ? "검증 통과" : tone === "progress" ? "검증 중" : state.phase === "failed" ? "검증 안 함" : "대기"
        return (
          <div key={slot.ext} className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[15px] font-semibold">
                {slot.label} · {state.files[slot.ext]?.name ?? slot.ext}
              </span>
              <StatusTag tone={tone}>{label}</StatusTag>
            </div>
            <ol className="flex flex-col gap-1.5">
              {slot.checks.map((c, j) => {
                const i = base + j
                const failedHere = state.phase === "failed" && i === state.step
                const done = state.phase === "passed" || i < state.step
                const active = state.phase === "validating" && i === state.step
                return (
                  <li
                    key={c}
                    className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px]", failedHere ? "bg-destructive/10 font-semibold text-destructive" : "bg-card")}
                  >
                    {failedHere ? (
                      <X aria-hidden className="size-4" />
                    ) : done ? (
                      <Check aria-hidden className="size-4 text-success" />
                    ) : active ? (
                      <Loader2 aria-hidden className="size-4 animate-spin text-primary" />
                    ) : (
                      <span aria-hidden className="size-4 rounded-full border border-border" />
                    )}
                    <span className={!done && !active && !failedHere ? "text-muted-foreground" : undefined}>{c}</span>
                    <span className="ml-auto text-sm text-muted-foreground">{failedHere ? "실패" : done ? "통과" : active ? "확인 중" : "대기"}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
    </div>
  )
}

"use client"

import { AlertTriangle, Boxes, Check, CheckCircle2, Database, FileUp, Loader2, RotateCcw, Search, X } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import {
  formatSize,
  HUB_INSTANCES,
  INITIAL_STATES,
  listStatus,
  TYPE_LABEL,
  type AssetState,
  type AttachedFile,
  type HubInstance,
  type ListStatus,
} from "@/components/v2-register/data"
import { DemoNote, KeyValues, NextAction, StatusTag, TechDetails, type Tone } from "@/components/works/primitives"
import { cn } from "@/lib/utils"

const STEP_MS = 1100

const PURPOSE: Record<string, { purpose: string; link?: { href: string; label: string } }> = {
  "surface-seg": { purpose: "강판 표면 사진에서 결함이 있는 영역을 픽셀 단위로 표시해요." },
  "car-exterior-ds": {
    purpose: "도장 후 차체 외관 사진 모음이에요. 외관 검사 AI를 학습·평가하는 데 쓰여요.",
    link: { href: "/datasets/car-exterior", label: "데이터셋 보기" },
  },
  "motor-lstm": {
    purpose: "모터 진동 기록으로 고장 징후를 미리 알아채요.",
    link: { href: "/models/predictive-maintenance", label: "AI 소개 보기" },
  },
  "weld-bead-ds": { purpose: "로봇 용접 라인의 비드 사진을 양품·불량으로 나눠 둔 데이터예요." },
  "press-log-ds": { purpose: "프레스 3호기의 압력·온도 기록과 불량 여부를 함께 담은 데이터예요." },
  "yolo-exterior": {
    purpose: "차체 사진에서 스크래치·찍힘 같은 외관 결함의 위치를 찾아요.",
    link: { href: "/models/yolov8-car-inspection", label: "AI 소개 보기" },
  },
}

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

export function Register() {
  const [states, setStates] = useState<Record<string, AssetState>>(INITIAL_STATES)
  const [selectedId, setSelectedId] = useState("car-exterior-ds")
  const [query, setQuery] = useState("")
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HUB_INSTANCES
    return HUB_INSTANCES.filter((i) => i.name.toLowerCase().includes(q) || i.hubId.toLowerCase().includes(q))
  }, [query])

  const todoCount = HUB_INSTANCES.filter((i) => ["needs-file", "ready", "failed"].includes(listStatus(states[i.id]))).length

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
            {todoCount > 0 ? `할 일이 있는 자산이 ${todoCount}개 있어요. ` : ""}고른 항목에 실제 파일을 연결해 등록하면, 파일이 제대로
            동작하는지 자동으로 확인해요.
          </p>
        </div>
        <ol aria-label="등록 순서" className="grid grid-cols-3 gap-2 lg:w-[480px]">
          {["Model Hub 항목 고르기", "실제 파일 올리고 등록", "자동 검증 후 사용"].map((t, i) => (
            <li key={t} className="flex flex-col gap-1 rounded-xl bg-card p-3 ring-1 ring-border">
              <span className="text-sm font-semibold tabular-nums text-primary">{i + 1}단계</span>
              <span className="text-[15px] font-medium leading-snug">{t}</span>
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
              placeholder="이름으로 찾기"
              className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {GROUPS.map((g) => {
            const items = filtered.filter((i) => g.statuses.includes(listStatus(states[i.id])))
            if (items.length === 0) return null
            return (
              <div key={g.title} className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {g.title} <span className="tabular-nums">{items.length}</span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {items.map((i) => {
                    const status = listStatus(states[i.id])
                    const selected = i.id === selectedId
                    const Icon = i.type === "model" ? Boxes : Database
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
                              {TYPE_LABEL[i.type]} · {i.requiredExt} 파일
                            </span>
                            <StatusTag tone={LIST_META[status].tone}>{LIST_META[status].label}</StatusTag>
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
          <p className="text-sm leading-relaxed text-muted-foreground">Model Hub에서 내가 올린 항목만 보여요.</p>
        </nav>

        <Workspace
          key={instance.id}
          instance={instance}
          state={states[instance.id]}
          onAttach={(file) => patch(instance.id, { file })}
          onOutcome={(outcome) => patch(instance.id, { outcome })}
          onRegister={() => patch(instance.id, { phase: "validating", step: 0 })}
          onReplaceFile={() => patch(instance.id, { phase: "draft", step: 0, file: null, outcome: "pass" })}
        />
      </div>
    </div>
  )
}

type WorkspaceProps = {
  instance: HubInstance
  state: AssetState
  onAttach: (file: AttachedFile | null) => void
  onOutcome: (outcome: AssetState["outcome"]) => void
  onRegister: () => void
  onReplaceFile: () => void
}

function Workspace({ instance, state, onAttach, onOutcome, onRegister, onReplaceFile }: WorkspaceProps) {
  const info = PURPOSE[instance.id]
  const registered = state.phase !== "draft"
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (state.phase === "passed" || state.phase === "failed") headingRef.current?.focus()
  }, [state.phase])

  return (
    <section aria-labelledby="ws-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-medium">{TYPE_LABEL[instance.type]}</span>
          <StageTrack state={state} />
        </div>
        <h2 id="ws-title" className="text-3xl font-bold tracking-tight text-balance">
          {instance.name}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-pretty">{info?.purpose}</p>
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
                {state.file?.name} 파일이 {instance.checks.length}가지 확인을 모두 통과했어요. AI 찾아보기 목록에 나타나고,{" "}
                {instance.type === "model" ? "추론을 바로 해볼 수 있어요." : "AI 학습과 평가에 쓸 수 있어요."}
              </p>
              <p className="text-sm text-muted-foreground">
                “형식이 맞다”는 뜻이에요. 우리 데이터에서 얼마나 잘 맞는지는 추론으로 직접 확인해 보세요.
              </p>
            </div>
          </div>
          <NextAction
            title={instance.type === "model" ? "이 AI에 사진을 넣어 볼까요?" : "이 데이터를 쓰는 AI를 볼까요?"}
            primary={
              info?.link
                ? {
                    href: instance.type === "model" ? `${info.link.href}/deploy` : info.link.href,
                    label: instance.type === "model" ? "추론 해보기" : "데이터셋 보기",
                  }
                : { href: "/models", label: "AI 찾아보기에서 보기" }
            }
            secondary={info?.link && instance.type === "model" ? info.link : undefined}
          />
          <TechDetails title="통과한 검증 항목" hint={`${instance.checks.length}개 모두 통과`}>
            <ChecksList instance={instance} state={state} />
          </TechDetails>
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
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReplaceFile}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <RotateCcw aria-hidden className="size-4" /> 파일 바꿔서 다시 올리기
            </button>
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <h4 className="text-[15px] font-semibold">어디서 멈췄나요?</h4>
            <ChecksList instance={instance} state={state} />
          </div>
        </div>
      )}

      <TechDetails title="Model Hub 항목 정보 (기술 정보)" hint="instance ID, 형식, 업로드 날짜">
        <KeyValues
          items={[
            { label: "instance ID", value: instance.hubId },
            ...instance.meta,
            { label: "Model Hub 업로드", value: instance.uploadedAt },
            ...(state.file ? [{ label: "연결한 파일", value: `${state.file.name} · ${formatSize(state.file.size)}` }] : []),
          ]}
        />
      </TechDetails>
    </section>
  )
}

function StageTrack({ state }: { state: AssetState }) {
  const regDone = state.phase !== "draft"
  const val =
    state.phase === "passed"
      ? { label: "검증 완료", tone: "success" as Tone }
      : state.phase === "failed"
        ? { label: "검증 실패", tone: "danger" as Tone }
        : state.phase === "validating"
          ? { label: "검증 중", tone: "progress" as Tone }
          : { label: "검증 전", tone: "neutral" as Tone }
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

function RegisterForm({
  instance,
  state,
  onAttach,
  onOutcome,
  onRegister,
}: Pick<WorkspaceProps, "instance" | "state" | "onAttach" | "onOutcome" | "onRegister">) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileWord = instance.type === "model" ? "모델 파일" : "데이터 파일"

  const take = (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(instance.requiredExt)) {
      setError(`${instance.requiredExt} 파일만 올릴 수 있어요. 고른 파일: ${file.name}`)
      return
    }
    setError(null)
    onAttach({ name: file.name, size: file.size })
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold">등록하려면 두 가지가 필요해요</h3>
        <p className="text-[15px] text-muted-foreground">둘 다 준비되면 등록 버튼이 켜져요.</p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        <li className="flex flex-col gap-2 rounded-xl bg-success/10 p-5">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-success">
            <Check aria-hidden className="size-4" /> Model Hub 항목 · 준비됨
          </span>
          <span className="text-lg font-semibold">{instance.name}</span>
          <span className="text-sm text-muted-foreground">이름·용도 같은 설명 정보예요.</span>
        </li>
        <li
          className={cn(
            "flex flex-col gap-2 rounded-xl p-5",
            state.file ? "bg-success/10" : "border-2 border-dashed border-warning bg-warning/10",
          )}
        >
          <span className={cn("flex items-center gap-2 text-[15px] font-semibold", state.file ? "text-success" : "text-warning-foreground")}>
            {state.file ? <Check aria-hidden className="size-4" /> : <FileUp aria-hidden className="size-4" />}
            실제 {fileWord} ({instance.requiredExt}) · {state.file ? "준비됨" : "필요해요"}
          </span>
          {state.file ? (
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold">{state.file.name}</span>
                <span className="text-sm text-muted-foreground">{formatSize(state.file.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => onAttach(null)}
                aria-label="연결한 파일 빼기"
                className="rounded-md p-2 hover:bg-card"
              >
                <X aria-hidden className="size-4" />
              </button>
            </span>
          ) : (
            <span className="text-[15px] leading-relaxed">
              {instance.type === "model" ? "학습이 끝난 AI 가중치 파일이에요." : "이미지·라벨을 담은 압축 파일이에요."}
            </span>
          )}
        </li>
      </ul>

      {!state.file ? (
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
            "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-primary bg-secondary" : "border-border",
          )}
        >
          <FileUp aria-hidden className="size-8 text-primary" />
          <p className="text-lg font-semibold">{instance.requiredExt} 파일을 여기로 끌어 놓으세요</p>
          <div className="flex flex-wrap justify-center gap-3">
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-lg border border-border bg-card px-5 py-3 text-[15px] font-semibold hover:bg-muted"
            >
              내 컴퓨터에서 고르기
            </label>
            <button
              type="button"
              onClick={() =>
                onAttach({
                  name: `${instance.id.replace(/-/g, "_")}${instance.requiredExt}`,
                  size: instance.type === "model" ? 86_400_000 : 640_000_000,
                })
              }
              className="rounded-lg px-5 py-3 text-[15px] font-medium text-primary hover:underline"
            >
              예시 파일로 해보기
            </button>
          </div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={instance.requiredExt}
            className="sr-only"
            onChange={(e) => take(e.target.files?.[0])}
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
          <AlertTriangle aria-hidden className="size-4 shrink-0" /> {error}
        </p>
      ) : null}

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
          disabled={!state.file}
          onClick={onRegister}
          className="h-12 rounded-lg bg-accent px-6 text-base font-semibold text-accent-foreground hover:bg-accent/85 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {state.file ? "등록하고 검증 시작" : `${instance.requiredExt} 파일을 먼저 올려 주세요`}
        </button>
      </div>
      <DemoNote>데모 환경이에요. 파일은 서버로 보내지지 않고, 검증은 정해진 순서로 흉내 냅니다.</DemoNote>
    </div>
  )
}

function Validating({ instance, state }: { instance: HubInstance; state: AssetState }) {
  const pct = Math.round((state.step / instance.checks.length) * 100)
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8" aria-live="polite">
      <div className="flex items-center gap-4">
        <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-success">등록 완료 · 이제 파일을 확인하고 있어요</p>
          <h3 className="text-2xl font-bold">
            {instance.checks[Math.min(state.step, instance.checks.length - 1)]} 확인 중 ({state.step + 1}/{instance.checks.length})
          </h3>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.max(pct, 6)}%` }} />
      </div>
      <ChecksList instance={instance} state={state} />
      <p className="text-[15px] text-muted-foreground">다른 항목을 보고 와도 검증은 계속 진행돼요.</p>
    </div>
  )
}

function ChecksList({ instance, state }: { instance: HubInstance; state: AssetState }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {instance.checks.map((c, i) => {
        const failedHere = state.phase === "failed" && i === state.step
        const done = state.phase === "passed" || i < state.step
        const active = state.phase === "validating" && i === state.step
        return (
          <li
            key={c}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px]",
              failedHere ? "bg-destructive/10 font-semibold text-destructive" : "bg-muted/60",
            )}
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
            <span className="ml-auto text-sm text-muted-foreground">
              {failedHere ? "실패" : done ? "통과" : active ? "확인 중" : "대기"}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

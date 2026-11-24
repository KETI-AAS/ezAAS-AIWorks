"use client"

import { AlertTriangle, ArrowLeft, Boxes, Check, CheckCircle2, Database, Layers, Loader2, Lock, Pencil, RotateCcw, Search, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { DemoNote, KeyValues, NextAction, StatusTag, TechDetails, type Tone } from "@/components/works/primitives"
import { AssetGroupForm, fieldId } from "@/components/works/register-form"
import { cn } from "@/lib/utils"
import {
  BACKEND_GAP,
  checksOf,
  datasetCategory,
  failIndex,
  formatSize,
  GROUP_LABEL,
  groupsOf,
  HUB_INSTANCES,
  INITIAL_STATES,
  KIND_LABEL,
  listStatus,
  readiness,
  sampleFilled,
  type AssetState,
  type Group,
  type HubInstance,
  type ListStatus,
} from "@/lib/works/hub-instances"
import { assetOption } from "@/lib/works/register-fields"

const STEP_MS = 900

type Patch = Partial<AssetState> | ((s: AssetState) => Partial<AssetState>)

const LIST_META: Record<ListStatus, { label: string; tone: Tone }> = {
  editing: { label: "작성 중", tone: "warning" },
  ready: { label: "검토할 수 있어요", tone: "progress" },
  review: { label: "검토 중", tone: "progress" },
  validating: { label: "검증 중", tone: "progress" },
  passed: { label: "사용 가능", tone: "success" },
  failed: { label: "확인이 필요해요", tone: "danger" },
}

const GROUPS: { title: string; statuses: ListStatus[] }[] = [
  { title: "할 일이 있어요", statuses: ["editing", "ready", "review", "failed"] },
  { title: "진행 중", statuses: ["validating"] },
  { title: "사용 가능", statuses: ["passed"] },
]

const KIND_ICON = { model: Boxes, dataset: Database, combined: Layers }

export function Register() {
  const [states, setStates] = useState<Record<string, AssetState>>(INITIAL_STATES)
  const [selectedId, setSelectedId] = useState("weld-qc-bundle")
  const [query, setQuery] = useState("")
  const instance = HUB_INSTANCES.find((i) => i.id === selectedId) ?? HUB_INSTANCES[0]

  const patch = useCallback(
    (id: string, next: Patch) =>
      setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...(typeof next === "function" ? next(prev[id]) : next) } })),
    [],
  )

  const runningKey = Object.entries(states)
    .filter(([, s]) => s.phase === "validating" || s.phase === "registering")
    .map(([id, s]) => `${id}:${s.phase}:${s.step}`)
    .join("|")

  useEffect(() => {
    if (!runningKey) return
    const timer = setTimeout(() => {
      setStates((prev) => {
        const next = { ...prev }
        for (const inst of HUB_INSTANCES) {
          const s = prev[inst.id]
          if (s.phase === "registering") {
            next[inst.id] = { ...s, phase: "validating", step: 0 }
            continue
          }
          if (s.phase !== "validating") continue
          const total = checksOf(inst, s).length
          if (s.outcome === "fail" && s.step === failIndex(inst, s)) next[inst.id] = { ...s, phase: "failed" }
          else if (s.step + 1 >= total) next[inst.id] = { ...s, phase: "passed", step: total }
          else next[inst.id] = { ...s, step: s.step + 1 }
        }
        return next
      })
    }, STEP_MS)
    return () => clearTimeout(timer)
  }, [runningKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HUB_INSTANCES
    return HUB_INSTANCES.filter((i) => i.name.toLowerCase().includes(q) || i.hubId.toLowerCase().includes(q))
  }, [query])

  const todoCount = HUB_INSTANCES.filter((i) => GROUPS[0].statuses.includes(listStatus(i, states[i.id]))).length

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
            {todoCount > 0 ? `할 일이 있는 항목이 ${todoCount}개 있어요. ` : ""}Model Hub에서 가져온 정보는 그대로 두고, 등록에 필요한 정보와 실제 파일을 채우면 돼요.
          </p>
        </div>
        <ol aria-label="등록 순서" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[680px]">
          {[
            { t: `instance 고르기 · ${HUB_INSTANCES.length}개`, done: true },
            { t: "정보 입력 · 파일 올리기", done: false },
            { t: "검토 후 등록", done: false },
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

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
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
                    const s = states[i.id]
                    const status = listStatus(i, s)
                    const r = readiness(i, s)
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
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {KIND_LABEL[i.kind]}
                              {s.phase === "edit" ? ` · 필수 ${r.done}/${r.total}` : ""}
                            </span>
                            <span className="flex flex-wrap gap-1.5">
                              <StatusTag tone={LIST_META[status].tone}>{LIST_META[status].label}</StatusTag>
                              {i.prototype ? (
                                <span className="rounded-full border border-dashed border-warning px-2 py-0.5 text-xs text-warning-foreground">프로토타입</span>
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
          <p className="text-sm leading-relaxed text-muted-foreground">Model Hub에서 내가 올린 instance만 보여요. 다른 항목을 골라도 입력한 내용은 그대로 남아요.</p>
        </nav>

        <Workspace key={instance.id} instance={instance} state={states[instance.id]} onPatch={(n) => patch(instance.id, n)} />
      </div>
    </div>
  )
}

function Workspace({ instance, state, onPatch }: { instance: HubInstance; state: AssetState; onPatch: (n: Patch) => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    if (state.phase !== "edit") headingRef.current?.focus()
  }, [state.phase])

  const showError = (g: Group, k: string) => attempted || touched.has(`${g}.${k}`)
  const touch = (g: Group, k: string) => setTouched((prev) => (prev.has(`${g}.${k}`) ? prev : new Set(prev).add(`${g}.${k}`)))
  const r = readiness(instance, state)

  const goReview = () => {
    if (!r.ready) {
      setAttempted(true)
      const first = r.groups.find((g) => g.missing.length)
      if (first) document.getElementById(fieldId(instance.id, first.group, first.missing[0].key))?.focus()
      return
    }
    onPatch({ phase: "review" })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <section aria-labelledby="ws-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-medium">{KIND_LABEL[instance.kind]}</span>
          <StageTrack phase={state.phase} />
        </div>
        <h2 id="ws-title" ref={headingRef} tabIndex={-1} className="text-3xl font-bold tracking-tight text-balance outline-none">
          {instance.name}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-pretty">{instance.purpose}</p>
        {instance.prototype ? (
          <DemoNote>
            모델과 데이터셋을 함께 담은 instance는 한 번에 등록하는 프로토타입이에요. 두 그룹을 모두 채워야 등록할 수 있어요. 서버 계약은 아래 “백엔드에 필요한 변경”에 정리했어요.
          </DemoNote>
        ) : null}
      </div>

      {state.phase === "edit" ? (
        <>
          {groupsOf(instance).map((g) => (
            <AssetGroupForm
              key={g}
              inst={instance}
              group={g}
              state={state}
              showError={showError}
              onTouch={touch}
              onPatch={onPatch}
              onSample={() => onPatch((s) => sampleFilled(instance, g, s))}
            />
          ))}
          <ReadinessBar instance={instance} state={state} attempted={attempted} onReview={goReview} />
        </>
      ) : state.phase === "review" ? (
        <ReviewPanel instance={instance} state={state} onEdit={() => onPatch({ phase: "edit" })} onOutcome={(outcome) => onPatch({ outcome })} onRegister={() => onPatch({ phase: "registering" })} />
      ) : (
        <AfterRegister
          instance={instance}
          state={state}
          onRetry={(group) => {
            const files = { ...state.files }
            delete files[group]
            setAttempted(false)
            onPatch({ phase: "edit", step: 0, files, outcome: "pass" })
          }}
        />
      )}

      <TechDetails title="Model Hub 항목 정보 (기술 정보)" hint="instance ID, AAS 메타데이터, 업로드 날짜">
        <KeyValues
          items={[
            { label: "instance ID", value: instance.hubId },
            { label: "Model Hub 업로드", value: instance.uploadedAt },
            ...(instance.imported.datasetFileType ? [{ label: "AAS Metadata.Filetype", value: instance.imported.datasetFileType }] : []),
            ...instance.meta,
          ]}
        />
      </TechDetails>

      <TechDetails title="백엔드에 필요한 변경" hint="지금은 화면에서만 처리되는 부분" defaultOpen={instance.prototype}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">
          {BACKEND_GAP.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </TechDetails>
    </section>
  )
}

function StageTrack({ phase }: { phase: AssetState["phase"] }) {
  const registered = !["edit", "review", "registering"].includes(phase)
  const reg: { label: string; tone: Tone } =
    phase === "edit" ? { label: "작성 중", tone: "warning" } : phase === "review" ? { label: "검토 중", tone: "progress" } : phase === "registering" ? { label: "등록 중", tone: "progress" } : { label: "등록 완료", tone: "success" }
  const val: { label: string; tone: Tone } =
    phase === "passed" ? { label: "파일 검증 완료", tone: "success" } : phase === "failed" ? { label: "파일 검증 실패", tone: "danger" } : phase === "validating" ? { label: "파일 검증 중", tone: "progress" } : { label: "검증 전", tone: "neutral" }
  return (
    <span className="flex items-center gap-2" aria-label="진행 상태">
      <StatusTag tone={reg.tone}>{reg.label}</StatusTag>
      <span aria-hidden className="text-muted-foreground">
        →
      </span>
      <StatusTag tone={registered ? val.tone : "neutral"}>{val.label}</StatusTag>
    </span>
  )
}

function ReadinessBar({ instance, state, attempted, onReview }: { instance: HubInstance; state: AssetState; attempted: boolean; onReview: () => void }) {
  const r = readiness(instance, state)
  const pct = Math.round((r.done / r.total) * 100)
  return (
    <div className="sticky bottom-4 z-10 flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-lg ring-1 ring-border md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-[15px] font-semibold tabular-nums" aria-live="polite">
            {r.ready ? "모든 필수 항목과 파일이 준비됐어요" : `필수 ${r.total}개 중 ${r.done}개 완료`}
          </p>
          <div className="flex gap-3">
            {r.groups.map((g) => (
              <span key={g.group} className={cn("text-sm tabular-nums", g.done === g.total ? "text-success" : "text-muted-foreground")}>
                {GROUP_LABEL[g.group]} {g.done}/{g.total}
              </span>
            ))}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", r.ready ? "bg-success" : "bg-primary")} style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={onReview}
          aria-disabled={!r.ready}
          className={cn(
            "h-12 shrink-0 rounded-lg px-6 text-base font-semibold",
            r.ready ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          작성 내용 검토하기
        </button>
      </div>
      {attempted && !r.ready ? (
        <div role="alert" className="flex flex-col gap-2 rounded-xl bg-destructive/5 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[15px] font-semibold text-destructive">
            <AlertTriangle aria-hidden className="size-4" /> 아직 채우지 않은 항목이 있어요
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {r.groups.flatMap((g) =>
              g.missing.map((m) => (
                <li key={`${g.group}-${m.key}`}>
                  <button
                    type="button"
                    onClick={() => document.getElementById(fieldId(instance.id, g.group, m.key))?.focus()}
                    className="text-sm text-destructive underline underline-offset-2"
                  >
                    {groupsOf(instance).length > 1 ? `${GROUP_LABEL[g.group]} · ` : ""}
                    {m.label}
                  </button>
                </li>
              )),
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function SummaryList({ items }: { items: { label: string; value: string; imported?: boolean }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {it.label}
            {it.imported ? (
              <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 text-xs">
                <Lock aria-hidden className="size-3" /> Model Hub
              </span>
            ) : null}
          </dt>
          <dd className="text-[15px] font-medium leading-relaxed text-pretty">{it.value || "—"}</dd>
        </div>
      ))}
    </dl>
  )
}

function groupSummary(inst: HubInstance, s: AssetState, g: Group) {
  if (g === "dataset") {
    const d = s.dataset
    return {
      fields: [
        { label: "제목", value: d.title },
        { label: "작성자 · 버전", value: `${inst.imported.author} · ${inst.imported.version}`, imported: true },
        { label: "데이터 카테고리", value: datasetCategory(inst), imported: true },
        { label: "세부 유형", value: d.detailType },
        { label: "적용 Task", value: d.task },
        { label: "공개 범위", value: d.visibility },
        { label: "키워드", value: d.keywords.join(", ") },
        { label: "개요", value: d.summary },
      ],
      file: s.files.dataset ? `${s.files.dataset.name} · ${formatSize(s.files.dataset.size)}` : undefined,
    }
  }
  const m = s.model
  const opt = assetOption(m.assetType)
  return {
    fields: [
      { label: "제목", value: m.title },
      { label: "작성자 · 버전", value: `${inst.imported.author} · ${inst.imported.version}`, imported: true },
      { label: "Framework", value: inst.imported.framework ?? "—", imported: true },
      { label: "모델 자산 유형", value: `${opt.label} · ${opt.examples}` },
      { label: "적용 Task", value: m.task },
      { label: "공개 범위", value: m.visibility },
      { label: "키워드", value: m.keywords.join(", ") },
      ...(opt.source === "reference" ? [{ label: opt.referenceLabel ?? "모델 참조", value: m.artifactReference }] : []),
      ...(opt.dependencyLabel ? [{ label: opt.dependencyLabel, value: m.dependencyReference }] : []),
      { label: "개요", value: m.summary },
    ],
    file: opt.source === "file" && s.files.model ? `${s.files.model.name} · ${formatSize(s.files.model.size)}` : undefined,
  }
}

function ReviewPanel({ instance, state, onEdit, onOutcome, onRegister }: { instance: HubInstance; state: AssetState; onEdit: () => void; onOutcome: (o: AssetState["outcome"]) => void; onRegister: () => void }) {
  const groups = groupsOf(instance)
  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold">이대로 등록할까요?</h3>
        <p className="text-[15px] text-muted-foreground">
          {groups.length > 1 ? "모델과 데이터셋이 하나의 등록으로 함께 올라가요. " : ""}등록이 끝나면 올린 파일을 자동으로 검증해요.
        </p>
      </div>
      {groups.map((g) => {
        const sum = groupSummary(instance, state, g)
        const Icon = g === "model" ? Boxes : Database
        return (
          <div key={g} className="flex flex-col gap-4 rounded-xl bg-muted/40 p-5">
            <h4 className="flex items-center gap-2 text-lg font-semibold">
              <Icon aria-hidden className="size-4 text-primary" /> {GROUP_LABEL[g]} 정보
            </h4>
            <SummaryList items={sum.fields} />
            {sum.file ? (
              <p className="flex items-center gap-2 rounded-lg bg-card px-3 py-2.5 text-[15px]">
                <Check aria-hidden className="size-4 text-success" /> <span className="font-semibold">올릴 파일</span>
                <span className="min-w-0 truncate">{sum.file}</span>
              </p>
            ) : null}
          </div>
        )
      })}
      <div className="flex flex-col gap-4 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 self-start rounded-lg px-4 py-3 text-[15px] font-semibold hover:bg-muted">
          <ArrowLeft aria-hidden className="size-4" /> <Pencil aria-hidden className="size-4" /> 수정하기
        </button>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
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
          <button type="button" onClick={onRegister} className="h-12 rounded-lg bg-accent px-6 text-base font-semibold text-accent-foreground hover:bg-accent/85">
            등록하기
          </button>
        </div>
      </div>
      <DemoNote>데모 환경이에요. 입력값과 파일은 서버로 보내지지 않고, 등록과 검증은 정해진 순서로 흉내 냅니다.</DemoNote>
    </div>
  )
}

function AfterRegister({ instance, state, onRetry }: { instance: HubInstance; state: AssetState; onRetry: (g: Group) => void }) {
  const checks = checksOf(instance, state)

  if (state.phase === "registering") {
    return (
      <div className="flex items-center gap-4 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8" aria-live="polite">
        <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold">등록하고 있어요</h3>
          <p className="text-[15px] text-muted-foreground">등록이 끝나야 파일 검증이 시작돼요.</p>
        </div>
      </div>
    )
  }

  const registeredBanner = (
    <div className="flex items-center gap-3 rounded-xl bg-success/10 px-4 py-3 text-[15px]">
      <CheckCircle2 aria-hidden className="size-5 shrink-0 text-success" />
      <span>
        <span className="font-semibold">등록 완료</span>
        <span className="text-muted-foreground"> · {groupsOf(instance).map((g) => GROUP_LABEL[g]).join(" + ")} 정보와 파일이 등록됐어요</span>
      </span>
    </div>
  )

  if (state.phase === "validating") {
    const pct = Math.round((state.step / checks.length) * 100)
    const cur = checks[Math.min(state.step, checks.length - 1)]
    return (
      <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8" aria-live="polite">
        {registeredBanner}
        <div className="flex items-center gap-4">
          <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
          <h3 className="text-2xl font-bold">
            {GROUP_LABEL[cur.group]} · {cur.name} 확인 중 ({state.step + 1}/{checks.length})
          </h3>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.max(pct, 6)}%` }} />
        </div>
        <ValidationByGroup instance={instance} state={state} />
        <p className="text-[15px] text-muted-foreground">다른 항목을 보고 와도 검증은 계속 진행돼요.</p>
      </div>
    )
  }

  if (state.phase === "passed") {
    return (
      <>
        {registeredBanner}
        <div className="flex flex-col gap-4 rounded-2xl bg-success/10 p-6 md:flex-row md:items-center md:gap-6 md:p-8">
          <CheckCircle2 aria-hidden className="size-12 shrink-0 text-success" />
          <div className="flex flex-col gap-1.5">
            <h3 className="text-2xl font-bold">파일 검증까지 끝났어요. 이제 사용할 수 있어요</h3>
            <p className="text-[15px] leading-relaxed">{checks.length}가지 확인을 모두 통과했어요.</p>
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
        <ValidationByGroup instance={instance} state={state} />
      </>
    )
  }

  const failedGroup = checks[state.step]?.group ?? instance.failure.group
  return (
    <>
      {registeredBanner}
      <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 ring-2 ring-destructive/40 md:p-8">
        <div className="flex items-start gap-4">
          <AlertTriangle aria-hidden className="mt-1 size-7 shrink-0 text-destructive" />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">등록은 됐지만 {GROUP_LABEL[failedGroup]} 파일 검증에서 멈췄어요</p>
            <h3 className="text-2xl font-bold">{instance.failure.title}</h3>
            <p className="text-[15px] leading-relaxed">{instance.failure.detail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRetry(failedGroup)}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <RotateCcw aria-hidden className="size-4" /> {GROUP_LABEL[failedGroup]} 파일만 바꿔서 다시 올리기
        </button>
        <p className="text-sm text-muted-foreground">입력한 정보는 그대로 남고, 바꿀 파일만 비워져요.</p>
        <ValidationByGroup instance={instance} state={state} />
      </div>
    </>
  )
}

function ValidationByGroup({ instance, state }: { instance: HubInstance; state: AssetState }) {
  const checks = checksOf(instance, state)
  const groups = groupsOf(instance)
  return (
    <div className={cn("grid gap-4", groups.length > 1 && "md:grid-cols-2")}>
      {groups.map((g) => {
        const idx = checks.map((c, i) => ({ ...c, i })).filter((c) => c.group === g)
        const base = idx[0]?.i ?? 0
        const end = base + idx.length
        const failed = state.phase === "failed" && state.step >= base && state.step < end
        const passed = state.phase === "passed" || state.step >= end
        const tone: Tone = failed ? "danger" : passed ? "success" : state.phase === "validating" && state.step >= base ? "progress" : "neutral"
        const label = failed ? "검증 실패" : passed ? "검증 통과" : tone === "progress" ? "검증 중" : state.phase === "failed" ? "검증 안 함" : "대기"
        const fileName = g === "model" ? (assetOption(state.model.assetType).source === "file" ? state.files.model?.name : state.model.artifactReference) : state.files.dataset?.name
        return (
          <div key={g} className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[15px] font-semibold">
                {GROUP_LABEL[g]} · {fileName ?? "—"}
              </span>
              <StatusTag tone={tone}>{label}</StatusTag>
            </div>
            <ol className="flex flex-col gap-1.5">
              {idx.map((c) => {
                const failedHere = state.phase === "failed" && c.i === state.step
                const done = state.phase === "passed" || c.i < state.step
                const active = state.phase === "validating" && c.i === state.step
                return (
                  <li key={c.name} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px]", failedHere ? "bg-destructive/10 font-semibold text-destructive" : "bg-card")}>
                    {failedHere ? (
                      <X aria-hidden className="size-4" />
                    ) : done ? (
                      <Check aria-hidden className="size-4 text-success" />
                    ) : active ? (
                      <Loader2 aria-hidden className="size-4 animate-spin text-primary" />
                    ) : (
                      <span aria-hidden className="size-4 rounded-full border border-border" />
                    )}
                    {c.name}
                    <span className="sr-only">{failedHere ? " 실패" : done ? " 통과" : active ? " 확인 중" : " 대기"}</span>
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

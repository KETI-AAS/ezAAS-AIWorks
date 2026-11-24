import { Boxes, Database, FileArchive, FileCode2, Plus, Search, type LucideIcon } from "lucide-react"

import { ProgressBar, StateIcon } from "@/components/concepts/state-icon"
import {
  type ConceptScreen,
  type LibraryAsset,
  type StepState,
  canCompleteRegistration,
  extracted,
  libraryAssets,
  registrationBlocker,
  selectedInstance,
  uploads,
  verificationChecks,
  verificationSummary,
} from "@/lib/concept-sample"
import { cn } from "@/lib/utils"

const statusText: Record<LibraryAsset["status"], { label: string; state: StepState }> = {
  draft: { label: "작성 중", state: "active" },
  verifying: { label: "검증 중", state: "active" },
  verified: { label: "사용 가능", state: "done" },
  warn: { label: "확인 필요", state: "warn" },
}

export function ConceptAssets({ screen }: { screen: ConceptScreen }) {
  const assets = libraryAssets.map((a) =>
    a.id === "surface" && screen === "verify" ? { ...a, status: "warn" as const, updated: "1분 전" } : a,
  )
  const selected = assets[0]

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
        <span className="font-semibold tracking-tight">AI Works</span>
        <div className="flex h-8 max-w-md flex-1 items-center gap-2 rounded-md bg-muted px-3 text-sm text-muted-foreground">
          <Search aria-hidden className="size-4" /> 내 자산, 모델, 데이터 검색
        </div>
        <button
          type="button"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          <Plus aria-hidden className="size-4" /> 새 자산
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr_280px]">
        {/* 목록 */}
        <section aria-label="내 자산 목록" className="hidden min-h-0 flex-col border-r border-border bg-card lg:flex">
          <div className="flex gap-1 border-b border-border p-2 text-xs" role="tablist" aria-label="자산 종류">
            {["전체 4", "모델", "데이터", "공개됨"].map((f, i) => (
              <span
                key={f}
                role="tab"
                aria-selected={i === 0}
                className={cn("rounded px-2 py-1", i === 0 ? "bg-secondary font-medium" : "text-muted-foreground")}
              >
                {f}
              </span>
            ))}
          </div>
          <ul className="flex-1 overflow-y-auto">
            {assets.map((a) => {
              const s = statusText[a.status]
              const isSelected = a.id === selected.id
              return (
                <li
                  key={a.id}
                  aria-current={isSelected ? "true" : undefined}
                  className={cn(
                    "flex flex-col gap-1.5 border-b border-l-2 border-b-border border-l-transparent px-4 py-3",
                    isSelected && "border-l-primary bg-accent/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.updated}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Boxes aria-hidden className="size-3" /> {a.model}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Database aria-hidden className="size-3" /> {a.dataset}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs">
                    <StateIcon state={s.state} className="size-3" /> {s.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        {/* 상세 */}
        <main className="min-h-0 overflow-y-auto p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {screen === "register" ? "작성 중인 자산" : "등록된 자산"} · {selectedInstance.task}
              </span>
              <h2 className="text-xl font-semibold">{selected.name}</h2>
            </div>

            <RelationshipMap screen={screen} />

            {screen === "register" ? (
              <p className="text-sm text-muted-foreground">
                세 칸이 모두 채워지면 자산이 등록되고, 각 칸에서 검증 결과를 바로 확인할 수 있습니다.
              </p>
            ) : (
              <VerificationMatrix />
            )}
          </div>
        </main>

        {/* 이 자산으로 할 수 있는 일 */}
        <aside aria-label="사용 가능한 작업" className="flex flex-col gap-3 border-t border-border bg-card p-4 lg:border-t-0 lg:border-l">
          <h3 className="text-sm font-medium">이 자산으로 할 수 있는 일</h3>
          {screen === "register" ? (
            <>
              <ActionRow
                label="등록 완료"
                state={canCompleteRegistration ? "done" : "todo"}
                reason={registrationBlocker}
                primary
                disabled={!canCompleteRegistration}
              />
              <ActionRow label="파일 검증" state="locked" reason="등록 완료 후 자동 시작" disabled />
              <ActionRow label="추론 실행" state="locked" reason="검증 통과 후 사용 가능" disabled />
              <ActionRow label="추가 학습" state="locked" reason="검증 통과 후 사용 가능" disabled />
            </>
          ) : (
            <>
              <ActionRow label="추론 실행" state="done" reason="모델 검증 4개 모두 통과" primary />
              <ActionRow label="추가 학습" state="warn" reason="라벨 없는 이미지 12장 정리 필요" />
              <ActionRow label="연계 자산으로 공개" state="done" reason="팀원에게 탐색·실행 허용" />
              <ActionRow label="파일 교체" state="todo" reason="교체 시 다시 검증합니다" />
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function RelationshipMap({ screen }: { screen: ConceptScreen }) {
  const model = uploads.find((u) => u.kind === "model")!
  const data = uploads.find((u) => u.kind === "data")!
  const after = screen === "verify"
  const modelChecks = verificationChecks.filter((c) => c.target === "model")
  const dataChecks = verificationChecks.filter((c) => c.target === "data")

  return (
    <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
      <Node icon={Boxes} kind="instance" title={selectedInstance.name} sub="모델 허브에서 불러옴" state="done">
        <span className="break-all font-mono text-xs text-muted-foreground">{selectedInstance.id}</span>
      </Node>
      <Connector active />
      <Node
        icon={FileCode2}
        kind={`모델 파일 ${model.ext}`}
        title={extracted.model.name}
        sub={model.fileName}
        state={after ? "done" : model.state}
      >
        {after ? (
          <span className="text-xs text-success">검증 {modelChecks.length}개 통과</span>
        ) : (
          <ProgressBar value={model.progress} />
        )}
      </Node>
      <Connector active={after} label="학습에 사용" />
      <Node
        icon={FileArchive}
        kind={`데이터 파일 ${data.ext}`}
        title={extracted.dataset.name}
        sub={data.fileName}
        state={after ? dataChecks[0].state : data.state}
      >
        {after ? (
          <span className="text-xs text-warning-foreground dark:text-warning">라벨 누락 12장</span>
        ) : (
          <div className="flex flex-col gap-1">
            <ProgressBar value={data.progress} />
            <span className="text-xs text-muted-foreground">{data.note}</span>
          </div>
        )}
      </Node>
    </div>
  )
}

function Node({
  icon: Icon,
  kind,
  title,
  sub,
  state,
  children,
}: {
  icon: LucideIcon
  kind: string
  title: string
  sub: string
  state: StepState
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-4",
        state === "warn" ? "border-warning" : state === "done" ? "border-border" : "border-dashed border-primary",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon aria-hidden className="size-3.5" /> {kind}
        </span>
        <StateIcon state={state} className="size-3.5" />
      </div>
      <span className="text-sm font-medium">{title}</span>
      <span className="truncate font-mono text-xs text-muted-foreground">{sub}</span>
      {children}
    </div>
  )
}

function Connector({ active, label }: { active?: boolean; label?: string }) {
  return (
    <div aria-hidden className="hidden flex-col items-center justify-center gap-1 md:flex">
      {label && <span className="text-[11px] text-muted-foreground">{label}</span>}
      <span className={cn("h-px w-8", active ? "bg-primary" : "border-t border-dashed border-muted-foreground/50")} />
    </div>
  )
}

function VerificationMatrix() {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">
        검증 결과 · {verificationSummary.passed}/{verificationSummary.total} 통과
      </h3>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">대상별 검증 결과</caption>
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-normal">항목</th>
              <th className="px-4 py-2 font-normal">대상</th>
              <th className="px-4 py-2 font-normal">결과</th>
            </tr>
          </thead>
          <tbody>
            {verificationChecks.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <StateIcon state={c.state} className="size-3.5" /> {c.label}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.target === "model" ? "모델" : "데이터"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.plain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ActionRow({
  label,
  state,
  reason,
  primary,
  disabled,
}: {
  label: string
  state: StepState
  reason: string
  primary?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left disabled:cursor-not-allowed",
        primary && !disabled
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background",
        disabled && "opacity-60",
      )}
    >
      <StateIcon state={state} className={cn("mt-0.5 size-3.5", primary && !disabled && "text-primary-foreground")} />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className={cn("text-xs", primary && !disabled ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {reason}
        </span>
      </span>
    </button>
  )
}

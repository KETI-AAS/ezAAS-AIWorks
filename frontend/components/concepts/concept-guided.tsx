import { ArrowRight, ChevronDown, CircleHelp, Play } from "lucide-react"

import { ProgressBar, StateIcon } from "@/components/concepts/state-icon"
import {
  type ConceptScreen,
  type StepState,
  canCompleteRegistration,
  extracted,
  hubAccount,
  nextActions,
  registrationBlocker,
  selectedInstance,
  uploads,
  verificationChecks,
  verificationSummary,
} from "@/lib/concept-sample"
import { cn } from "@/lib/utils"

type Stage = { label: string; state: StepState }

function journeyFor(screen: ConceptScreen): Stage[] {
  const after = screen === "verify"
  return [
    { label: "허브 로그인", state: "done" },
    { label: "instance 선택", state: "done" },
    { label: "파일 업로드", state: after ? "done" : "active" },
    { label: "등록 완료", state: after ? "done" : "todo" },
    { label: "파일 검증", state: after ? "warn" : "todo" },
    { label: "활용", state: after ? "active" : "todo" },
  ]
}

export function ConceptGuided({ screen }: { screen: ConceptScreen }) {
  const journey = journeyFor(screen)
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* 내비게이션 = 진행 여정 */}
      <header className="flex shrink-0 flex-col gap-4 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold tracking-tight">AI Works</span>
          <span className="flex items-center gap-4 text-muted-foreground">
            <span>{hubAccount.org}</span>
            <span className="flex items-center gap-1">
              <CircleHelp aria-hidden className="size-4" /> 도움말
            </span>
          </span>
        </div>
        <nav aria-label="진행 단계">
          <ol className="flex items-center">
            {journey.map((s, i) => (
              <li key={s.label} className="flex flex-1 items-center gap-2 last:flex-none">
                <span
                  aria-current={s.state === "active" ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap text-xs",
                    s.state === "todo" ? "text-muted-foreground" : "text-foreground",
                    s.state === "active" && "font-semibold",
                  )}
                >
                  <StateIcon state={s.state} className="size-3.5" />
                  {s.label}
                </span>
                {i < journey.length - 1 && (
                  <span
                    aria-hidden
                    className={cn("mx-2 h-px flex-1", s.state === "done" ? "bg-success" : "bg-border")}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
          {screen === "register" ? <GuidedRegister /> : <GuidedVerify />}
        </div>
      </main>
    </div>
  )
}

function GuidedRegister() {
  const pending = uploads.find((u) => u.state !== "done")
  return (
    <>
      <section className="flex flex-col gap-4">
        <span className="text-sm font-medium text-primary">지금 할 일</span>
        <h2 className="text-2xl font-semibold leading-snug text-balance">
          데이터 파일 업로드가 끝나면 등록을 완료할 수 있어요
        </h2>
        {pending && (
          <div className="flex flex-col gap-2">
            <ProgressBar value={pending.progress} className="h-2.5" />
            <p className="flex justify-between text-sm text-muted-foreground">
              <span>{pending.fileName}</span>
              <span>
                {pending.progress}% · {pending.note.split("· ")[1]}
              </span>
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">등록에 필요한 3가지</h3>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          <ChecklistRow
            state="done"
            title="내 instance"
            value={selectedInstance.name}
            hint="모델 허브에서 불러왔어요"
            action="바꾸기"
          />
          {uploads.map((u) => (
            <ChecklistRow
              key={u.kind}
              state={u.state}
              title={`${u.label} (${u.ext})`}
              value={u.fileName}
              hint={u.note}
              action={u.state === "done" ? "다시 올리기" : undefined}
            />
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!canCompleteRegistration}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-medium text-primary-foreground disabled:opacity-40"
        >
          등록 완료하기 <ArrowRight aria-hidden className="size-4" />
        </button>
        <p className="text-center text-sm text-muted-foreground">
          {registrationBlocker}. 등록되면 파일 검증이 자동으로 시작돼요.
        </p>
      </div>

      <details className="group rounded-lg border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-muted-foreground">
          instance에서 읽어온 정보 (기술 상세)
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2 border-t border-border px-4 py-3 text-sm">
          <dt className="text-muted-foreground">모델</dt>
          <dd>
            {extracted.model.name} · {extracted.model.framework}
          </dd>
          <dt className="text-muted-foreground">입력 / 출력</dt>
          <dd>
            {extracted.model.input} → {extracted.model.output}
          </dd>
          <dt className="text-muted-foreground">데이터</dt>
          <dd>
            {extracted.dataset.name} · {extracted.dataset.count}
          </dd>
          <dt className="text-muted-foreground">instance ID</dt>
          <dd className="break-all font-mono text-xs">{selectedInstance.id}</dd>
        </dl>
      </details>
    </>
  )
}

function ChecklistRow({
  state,
  title,
  value,
  hint,
  action,
}: {
  state: StepState
  title: string
  value: string
  hint: string
  action?: string
}) {
  return (
    <li className="flex items-center gap-4 px-4 py-4">
      <StateIcon state={state} className="size-5" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{title}</span>
        <span className="truncate font-medium">{value}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      {action && <span className="text-sm text-primary">{action}</span>}
    </li>
  )
}

function GuidedVerify() {
  const [recommended, ...others] = nextActions
  return (
    <>
      <section className="flex flex-col gap-3">
        <span className="text-sm font-medium text-success">검증 완료</span>
        <h2 className="text-2xl font-semibold leading-snug text-balance">이 모델은 바로 써볼 수 있어요</h2>
        <p className="leading-relaxed text-muted-foreground">
          검증 {verificationSummary.total}개 중 {verificationSummary.passed}개를 통과했어요. 데이터 1개 항목은
          학습 전에만 확인하면 돼요.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-accent p-6 text-accent-foreground">
        <span className="text-sm">추천하는 다음 단계</span>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">{recommended.label}</h3>
          <p className="text-sm leading-relaxed">{recommended.description}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-primary px-5 font-medium text-primary-foreground"
        >
          <Play aria-hidden className="size-4" /> 추론 시작
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">그 다음에 할 수 있는 일</h3>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {others.map((a) => (
            <li key={a.id} className="flex items-start gap-4 px-4 py-4">
              <StateIcon state={a.state} className="mt-0.5 size-5" />
              <div className="flex flex-1 flex-col gap-1">
                <span className="font-medium">{a.label}</span>
                <span className="text-sm text-muted-foreground">{a.reason ?? a.description}</span>
              </div>
              <ArrowRight aria-hidden className="mt-1 size-4 text-muted-foreground" />
            </li>
          ))}
        </ul>
      </section>

      <details className="group rounded-lg border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-muted-foreground">
          검증 결과 자세히 보기
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="flex flex-col gap-3 border-t border-border px-4 py-3">
          {verificationChecks.map((c) => (
            <li key={c.id} className="flex items-start gap-3 text-sm">
              <StateIcon state={c.state} className="mt-0.5" />
              <div className="flex flex-col">
                <span>{c.plain}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.technical}</span>
              </div>
            </li>
          ))}
        </ul>
      </details>
    </>
  )
}

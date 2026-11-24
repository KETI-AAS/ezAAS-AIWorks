import {
  ArrowRight,
  Brain,
  FileArchive,
  FileCode2,
  Pin,
  Play,
  Plus,
  Share2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react"

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

const globalNav = ["탐색", "내 자산", "실행", "학습", "관리"]

type RailItem = { label: string; state: StepState; group: "등록" | "등록 후" }

function railFor(screen: ConceptScreen): RailItem[] {
  const registered = screen === "verify"
  return [
    { label: "instance 선택", state: "done", group: "등록" },
    { label: "실제 파일 연결", state: registered ? "done" : "active", group: "등록" },
    { label: "등록 완료", state: registered ? "done" : "todo", group: "등록" },
    { label: "파일 검증", state: registered ? "warn" : "locked", group: "등록 후" },
    { label: "추론 실행", state: registered ? "todo" : "locked", group: "등록 후" },
    { label: "추가 학습", state: registered ? "todo" : "locked", group: "등록 후" },
  ]
}

export function ConceptWorkspace({ screen }: { screen: ConceptScreen }) {
  const rail = railFor(screen)
  const activeLabel = screen === "register" ? "실제 파일 연결" : "파일 검증"

  return (
    <div className="flex h-full flex-col bg-surface text-foreground">
      {/* 전체 서비스 이동: 가로 글로벌 바 */}
      <header className="flex h-11 shrink-0 items-center gap-6 border-b border-border bg-card px-4">
        <span className="font-semibold tracking-tight">AI Works</span>
        <nav aria-label="서비스 이동" className="flex items-center gap-1 text-sm">
          {globalNav.map((item) => (
            <span
              key={item}
              className={cn(
                "rounded-md px-2.5 py-1",
                item === "내 자산" ? "bg-secondary font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {item}
            </span>
          ))}
        </nav>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          허브 · {hubAccount.id}
        </span>
      </header>

      {/* 열린 작업 탭: 작업 맥락 유지 */}
      <div
        role="tablist"
        aria-label="열린 작업"
        className="flex h-9 shrink-0 items-end gap-px border-b border-border bg-muted px-2 text-xs"
      >
        <span
          role="tab"
          aria-selected
          className="flex h-8 items-center gap-2 rounded-t-md border border-b-0 border-border bg-card px-3 font-medium"
        >
          <Pin aria-hidden className="size-3 text-primary" />
          {selectedInstance.name}
          <span className="text-muted-foreground">· {screen === "register" ? "등록 중" : "검증 결과"}</span>
          <X aria-hidden className="size-3 text-muted-foreground" />
        </span>
        <span role="tab" aria-selected={false} className="flex h-8 items-center gap-2 px-3 text-muted-foreground">
          Motor PdM AAS · 추론
        </span>
        <span className="flex h-8 items-center px-2 text-muted-foreground">
          <Plus aria-hidden className="size-3.5" />
          <span className="sr-only">새 작업</span>
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[200px_1fr_300px]">
        {/* 작업 안의 이동 */}
        <nav aria-label="작업 안의 이동" className="hidden flex-col gap-4 border-r border-border bg-card p-3 lg:flex">
          {(["등록", "등록 후"] as const).map((group) => (
            <div key={group} className="flex flex-col gap-0.5">
              <span className="px-2 pb-1 text-xs text-muted-foreground">{group}</span>
              {rail
                .filter((r) => r.group === group)
                .map((r) => (
                  <span
                    key={r.label}
                    aria-current={r.label === activeLabel ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                      r.label === activeLabel && "bg-accent font-medium text-accent-foreground",
                      r.state === "locked" && "text-muted-foreground",
                    )}
                  >
                    <StateIcon state={r.state} className="size-3.5" />
                    {r.label}
                  </span>
                ))}
            </div>
          ))}
        </nav>

        {/* 중앙 작업 영역 */}
        <main className="flex min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {screen === "register" ? <WorkspaceRegister /> : <WorkspaceVerify />}
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-card px-6 py-3">
            {screen === "register" ? (
              <>
                <p className="text-sm text-muted-foreground">{registrationBlocker}</p>
                <button
                  type="button"
                  disabled={!canCompleteRegistration}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
                >
                  등록 완료 <ArrowRight aria-hidden className="size-4" />
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">이 자산 탭에서 바로 이어서 실행합니다</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm"
                  >
                    <Brain aria-hidden className="size-4" /> 추가 학습
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    <Play aria-hidden className="size-4" /> 추론 실행
                  </button>
                </div>
              </>
            )}
          </footer>
        </main>

        {/* 보조 영역: 현재 자산 맥락 */}
        <aside aria-label="현재 자산 정보" className="hidden flex-col gap-5 overflow-y-auto border-l border-border bg-card p-4 text-sm lg:flex">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs text-muted-foreground">현재 자산</h3>
            <p className="font-semibold">{selectedInstance.name}</p>
            <p className="break-all font-mono text-xs text-muted-foreground">{selectedInstance.id}</p>
          </section>
          <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">모델</dt>
            <dd>{extracted.model.name}</dd>
            <dt className="text-muted-foreground">프레임워크</dt>
            <dd>{extracted.model.framework}</dd>
            <dt className="text-muted-foreground">입력</dt>
            <dd>{extracted.model.input}</dd>
            <dt className="text-muted-foreground">데이터</dt>
            <dd>{extracted.dataset.name}</dd>
            <dt className="text-muted-foreground">규모</dt>
            <dd>{extracted.dataset.count}</dd>
          </dl>
          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <h3 className="text-xs text-muted-foreground">진행 상태</h3>
            {screen === "register" ? (
              uploads.map((u) => (
                <div key={u.kind} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span>{u.label}</span>
                    <span className="font-mono">{u.progress}%</span>
                  </div>
                  <ProgressBar value={u.progress} />
                </div>
              ))
            ) : (
              <p className="text-xs leading-relaxed">
                검증 {verificationSummary.total}개 중 {verificationSummary.passed}개 통과,{" "}
                {verificationSummary.warned}개 확인 필요
              </p>
            )}
          </section>
          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <h3 className="text-xs text-muted-foreground">맥락 유지</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              상단 메뉴에서 실행·학습으로 이동해도 이 탭의 자산이 그대로 선택되어 있습니다.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function WorkspaceRegister() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">실제 파일 연결</h2>
        <p className="text-sm text-muted-foreground">
          선택한 instance에 기술된 모델과 데이터의 실제 파일을 연결합니다.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          <StateIcon state="done" />
          <span className="text-muted-foreground">instance</span>
          <span className="font-medium">{selectedInstance.name}</span>
        </span>
        <span className="text-xs text-primary">변경</span>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">연결할 파일</caption>
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-normal">구분</th>
              <th className="px-4 py-2 font-normal">파일</th>
              <th className="px-4 py-2 font-normal">크기</th>
              <th className="w-48 px-4 py-2 font-normal">상태</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((u) => (
              <tr key={u.kind} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    {u.kind === "model" ? (
                      <FileCode2 aria-hidden className="size-4 text-muted-foreground" />
                    ) : (
                      <FileArchive aria-hidden className="size-4 text-muted-foreground" />
                    )}
                    {u.label} <span className="font-mono text-xs text-muted-foreground">{u.ext}</span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{u.fileName}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.size}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs">
                      <StateIcon state={u.state} className="size-3.5" />
                      {u.note}
                    </span>
                    <ProgressBar value={u.progress} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border py-6 text-sm text-muted-foreground">
        <Upload aria-hidden className="size-4" />
        파일을 끌어다 놓아 교체할 수 있습니다
      </div>
    </div>
  )
}

function WorkspaceVerify() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">파일 검증 결과</h2>
          <p className="text-sm text-muted-foreground">등록 완료 후 자동으로 실행된 검증 기록입니다.</p>
        </div>
        <span className="flex items-center gap-1.5 text-sm">
          <ShieldCheck aria-hidden className="size-4 text-success" />
          {verificationSummary.passed}/{verificationSummary.total} 통과
        </span>
      </div>

      <ol className="flex flex-col overflow-hidden rounded-md border border-border bg-card">
        {verificationChecks.map((c) => (
          <li
            key={c.id}
            className={cn(
              "grid grid-cols-[72px_20px_1fr] items-start gap-3 border-t border-border px-4 py-3 first:border-t-0",
              c.state === "warn" && "bg-warning/10",
            )}
          >
            <span className="font-mono text-xs text-muted-foreground">{c.time}</span>
            <StateIcon state={c.state} />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {c.label}{" "}
                <span className="font-normal text-muted-foreground">· {c.target === "model" ? "모델" : "데이터"}</span>
              </span>
              <span className="text-sm text-muted-foreground">{c.plain}</span>
              <span className="font-mono text-xs text-muted-foreground">{c.technical}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">이 작업에서 이어서 할 수 있는 일</h3>
        <ul className="flex flex-col gap-1 text-sm">
          {nextActions.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-muted-foreground">
              {a.id === "publish" ? (
                <Share2 aria-hidden className="size-4" />
              ) : (
                <StateIcon state={a.state} className="size-3.5" />
              )}
              <span className="text-foreground">{a.label}</span>
              {a.reason && <span>— {a.reason}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

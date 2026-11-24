"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  Circle,
  Database,
  FileUp,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react"
import { useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { formatSize, TYPE_LABEL, type AssetState, type HubInstance, type Outcome } from "./data"

interface Props {
  instance: HubInstance
  state: AssetState
  onAttach: (file: { name: string; size: number } | null) => void
  onOutcome: (outcome: Outcome) => void
  onRegister: () => void
  onReplaceFile: () => void
}

export function InstanceInspector({ instance, state, onAttach, onOutcome, onRegister, onReplaceFile }: Props) {
  const TypeIcon = instance.type === "model" ? Boxes : Database
  const registered = state.phase !== "draft"

  return (
    <aside
      aria-labelledby="inspector-title"
      className="flex flex-col border-border bg-surface lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-l"
    >
      <div className="flex flex-col gap-5 px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <TypeIcon className="size-3.5" aria-hidden />
            {TYPE_LABEL[instance.type]} instance
          </span>
          <h2 id="inspector-title" className="text-xl font-semibold text-balance">
            {instance.name}
          </h2>
          <p className="font-mono text-xs text-muted-foreground">{instance.hubId}</p>
        </div>

        <StageTrack state={state} />

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-border py-4 text-sm">
          {instance.meta.map((m) => (
            <div key={m.label} className="contents">
              <dt className="text-muted-foreground">{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
          <dt className="text-muted-foreground">Model Hub 업로드</dt>
          <dd>{instance.uploadedAt}</dd>
        </dl>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-6 pb-8 lg:px-8">
        {registered ? (
          <ValidationView instance={instance} state={state} onReplaceFile={onReplaceFile} />
        ) : (
          <RegisterForm instance={instance} state={state} onAttach={onAttach} onOutcome={onOutcome} onRegister={onRegister} />
        )}
      </div>
    </aside>
  )
}

function StageTrack({ state }: { state: AssetState }) {
  const regDone = state.phase !== "draft"
  const valState =
    state.phase === "passed" ? "done" : state.phase === "failed" ? "error" : state.phase === "validating" ? "active" : "todo"
  return (
    <ol className="flex items-center gap-3 text-sm" aria-label="진행 단계">
      <li className={cn("flex items-center gap-1.5", regDone ? "text-success" : "font-medium text-foreground")}>
        {regDone ? <CheckCircle2 className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
        등록 {regDone ? "완료" : "전"}
      </li>
      <li aria-hidden className="h-px flex-1 bg-border" />
      <li
        className={cn(
          "flex items-center gap-1.5",
          valState === "done" && "text-success",
          valState === "error" && "text-warning",
          valState === "active" && "font-medium text-progress",
          valState === "todo" && "text-muted-foreground",
        )}
      >
        {valState === "done" && <CheckCircle2 className="size-4" aria-hidden />}
        {valState === "error" && <AlertTriangle className="size-4" aria-hidden />}
        {valState === "active" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {valState === "todo" && <Circle className="size-4" aria-hidden />}
        파일 검증{" "}
        {valState === "done" ? "완료" : valState === "error" ? "실패" : valState === "active" ? "중" : "대기"}
      </li>
    </ol>
  )
}

function RegisterForm({
  instance,
  state,
  onAttach,
  onOutcome,
  onRegister,
}: Pick<Props, "instance" | "state" | "onAttach" | "onOutcome" | "onRegister">) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileLabel = instance.type === "model" ? "모델 파일" : "데이터 파일"
  const ready = Boolean(state.file)

  function accept(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(instance.requiredExt)) {
      setError(`${instance.requiredExt} 파일만 연결할 수 있어요. 선택한 파일: ${file.name}`)
      return
    }
    setError(null)
    onAttach({ name: file.name, size: file.size })
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">
            실제 {fileLabel} <span className="font-mono font-normal text-muted-foreground">{instance.requiredExt}</span>
          </h3>
          <span className="text-xs text-muted-foreground">instance가 가리키는 파일 1개</span>
        </div>

        {state.file ? (
          <div className="flex items-center gap-3 rounded-md border border-success/40 bg-background px-4 py-3">
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm">{state.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(state.file.size)} · 선택됨 (데모: 서버로 전송되지 않음)
              </p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-sm text-primary hover:underline"
            >
              바꾸기
            </button>
            <button
              type="button"
              onClick={() => onAttach(null)}
              aria-label="파일 연결 해제"
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              accept(e.dataTransfer.files[0])
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors",
              dragging ? "border-primary bg-primary/10" : "border-input bg-background hover:border-primary",
            )}
          >
            <FileUp className="size-6 text-primary" aria-hidden />
            <span className="text-sm font-medium">{instance.requiredExt} 파일을 끌어다 놓거나 클릭해서 선택</span>
            <span className="text-xs text-muted-foreground">Model Hub에는 정보만 있고, 실제 파일은 여기서 연결합니다</span>
          </label>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={instance.requiredExt}
          className="sr-only"
          onChange={(e) => {
            accept(e.target.files?.[0])
            e.target.value = ""
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">등록 조건</h3>
        <ul className="flex flex-col gap-1.5 text-sm">
          <Requirement met label="Model Hub instance 선택됨" />
          <Requirement met={ready} label={`실제 ${fileLabel}(${instance.requiredExt}) 연결됨`} />
        </ul>
      </div>

      <fieldset className="flex flex-col gap-2 rounded-md border border-dashed border-warning/50 px-4 py-3">
        <legend className="px-1 text-xs font-medium text-warning">데모 설정</legend>
        <p className="text-xs leading-relaxed text-muted-foreground">
          실제 서버 검증은 없습니다. 등록 후 보여줄 검증 결과를 고르세요.
        </p>
        <div role="radiogroup" aria-label="데모 검증 결과" className="flex gap-2">
          {(["pass", "fail"] as const).map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={state.outcome === o}
              onClick={() => onOutcome(o)}
              className={cn(
                "rounded px-3 py-1 text-xs transition-colors",
                state.outcome === o
                  ? "bg-foreground text-background"
                  : "bg-secondary text-secondary-foreground hover:text-foreground",
              )}
            >
              {o === "pass" ? "검증 성공" : "검증 실패"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="button"
          disabled={!ready}
          onClick={onRegister}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          자산 등록하기
          <ArrowRight className="size-4" aria-hidden />
        </button>
        <p className="text-center text-xs text-muted-foreground">
          {ready ? "등록하면 파일 검증이 바로 시작됩니다." : `${fileLabel}을 연결하면 등록할 수 있어요.`}
        </p>
      </div>
    </>
  )
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-2", met ? "text-foreground" : "text-muted-foreground")}>
      {met ? <Check className="size-4 text-success" aria-hidden /> : <Circle className="size-4" aria-hidden />}
      {label}
      <span className="sr-only">{met ? " (충족)" : " (미충족)"}</span>
    </li>
  )
}

function ValidationView({
  instance,
  state,
  onReplaceFile,
}: Pick<Props, "instance" | "state" | "onReplaceFile">) {
  const failedAt = state.phase === "failed" ? instance.failure.check : -1
  const nextHref = instance.type === "model" ? "/models" : "/training"

  return (
    <>
      <div className="flex items-center gap-3 rounded-md bg-background px-4 py-3 text-sm">
        <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">등록 완료</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {state.file?.name} · {state.file ? formatSize(state.file.size) : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2" aria-live="polite">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">파일 검증</h3>
          <span className="text-xs text-warning">데모 결과</span>
        </div>
        <ol className="flex flex-col">
          {instance.checks.map((check, i) => {
            const status =
              i === failedAt
                ? "error"
                : state.phase === "passed" || i < state.step
                  ? "done"
                  : state.phase === "validating" && i === state.step
                    ? "active"
                    : "todo"
            return (
              <li key={check} className="flex items-center gap-3 border-b border-border py-2.5 text-sm last:border-b-0">
                {status === "done" && <CheckCircle2 className="size-4 text-success" aria-hidden />}
                {status === "error" && <AlertTriangle className="size-4 text-warning" aria-hidden />}
                {status === "active" && <Loader2 className="size-4 animate-spin text-progress" aria-hidden />}
                {status === "todo" && <Circle className="size-4 text-muted-foreground" aria-hidden />}
                <span className={cn(status === "todo" && "text-muted-foreground")}>{check}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {status === "done" ? "통과" : status === "error" ? "확인 필요" : status === "active" ? "확인 중" : "대기"}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {state.phase === "validating" && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          등록은 끝났고, 파일을 확인하고 있어요. 이 화면을 떠나도 검증은 계속됩니다.
        </p>
      )}

      {state.phase === "failed" && (
        <div className="flex flex-col gap-3 border-l-2 border-warning pl-4">
          <p className="font-medium">{instance.failure.title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{instance.failure.detail}</p>
          <button
            type="button"
            onClick={onReplaceFile}
            className="flex h-10 w-fit items-center gap-2 rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
          >
            <RotateCcw className="size-4" aria-hidden />
            {instance.requiredExt} 파일 교체 후 다시 검증
          </button>
        </div>
      )}

      {state.phase === "passed" && (
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <p className="text-sm text-muted-foreground">
            {instance.type === "model"
              ? "검증을 통과했어요. 이제 샘플 데이터로 추론을 실행해 볼 수 있습니다."
              : "검증을 통과했어요. 이 데이터로 모델을 추가 학습할 수 있습니다."}
          </p>
          <Link
            href={nextHref}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {instance.type === "model" ? "추론 실행하기" : "AI 학습에 사용하기"}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </>
  )
}

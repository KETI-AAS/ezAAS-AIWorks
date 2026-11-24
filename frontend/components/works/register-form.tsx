"use client"

import { AlertTriangle, Boxes, Check, Database, FileUp, Info, Loader2, Plus, Wand2, X } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { datasetCategory, formatSize, GROUP_LABEL, readiness, type AssetState, type Group, type HubInstance } from "@/lib/works/hub-instances"
import {
  accepts,
  assetOption,
  DATASET_ACCEPT,
  DETAIL_TYPES_BY_CATEGORY,
  KEYWORD_SUGGESTIONS,
  MODEL_ASSET_OPTIONS,
  requiredFields,
  TASK_TYPES,
  VISIBILITY_OPTIONS,
  type AttachedFile,
  type DatasetForm,
  type ModelAssetType,
  type ModelForm,
  type Visibility,
} from "@/lib/works/register-fields"

export const fieldId = (instId: string, group: Group, key: string) => `${instId}-${group}-${key}`

export const FILE_KEYS = new Set(["file", "artifactReference", "dependencyReference"])

export const GROUP_ICON = { model: Boxes, dataset: Database }
export const GROUP_TILE = { model: "bg-primary text-primary-foreground", dataset: "bg-accent text-accent-foreground" }

const controlClass = (invalid: boolean) =>
  cn(
    "w-full rounded-lg border bg-card px-3.5 text-[15px] outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40",
    invalid ? "border-destructive bg-destructive/5" : "border-border",
  )

function RequiredState({ done }: { done: boolean }) {
  return done ? (
    <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-success">
      <Check aria-hidden className="size-3.5" /> 완료
    </span>
  ) : (
    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[13px] font-medium text-muted-foreground">필수</span>
  )
}

function FieldHead({ id, htmlFor, label, done }: { id?: string; htmlFor?: string; label: string; done: boolean }) {
  const content = (
    <>
      {label}
      <span className="sr-only"> (필수{done ? ", 완료" : ""})</span>
    </>
  )
  return (
    <div className="flex items-center justify-between gap-3">
      {htmlFor ? (
        <label id={id} htmlFor={htmlFor} className="text-[15px] font-semibold">
          {content}
        </label>
      ) : (
        <span id={id} className="text-[15px] font-semibold">
          {content}
        </span>
      )}
      <RequiredState done={done} />
    </div>
  )
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm font-medium leading-relaxed text-destructive">
      <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {children}
    </p>
  )
}

function Field({ id, label, done, error, hint, children, className }: { id: string; label: string; done: boolean; error?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FieldHead htmlFor={id} label={label} done={done} />
      {children}
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

const describedBy = (id: string, error?: string, hint?: unknown) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined)

type Patch = Partial<AssetState> | ((s: AssetState) => Partial<AssetState>)

type GroupFormProps = {
  inst: HubInstance
  group: Group
  state: AssetState
  showError: (group: Group, key: string) => boolean
  onTouch: (group: Group, key: string) => void
  onPatch: (next: Patch) => void
  onSample: () => void
}

type FieldCtx = { err: (k: string) => string | undefined; done: (k: string) => boolean; onTouch: (k: string) => void }

export function AssetGroupForm({ inst, group, state, showError, onTouch, onPatch, onSample }: GroupFormProps) {
  const r = readiness(inst, state).groups.find((g) => g.group === group)!
  const ctx: FieldCtx = {
    err: (key) => (showError(group, key) ? r.errors[key] : undefined),
    done: (key) => !r.errors[key],
    onTouch: (k) => onTouch(group, k),
  }
  const fields = requiredFields(group, state.model)
  const desc = fields.filter((f) => !FILE_KEYS.has(f.key))
  const files = fields.filter((f) => FILE_KEYS.has(f.key))
  const count = (list: typeof fields) => list.filter((f) => !r.errors[f.key]).length
  const Icon = GROUP_ICON[group]
  const titleId = `${inst.id}-${group}-title`

  return (
    <section aria-labelledby={titleId} className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-7">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-10 items-center justify-center rounded-xl", GROUP_TILE[group])}>
            <Icon aria-hidden className="size-5" />
          </span>
          <div className="flex flex-col">
            <h3 id={titleId} className="text-xl font-bold tracking-tight">
              {GROUP_LABEL[group]} 정보
            </h3>
            <p className={cn("text-sm tabular-nums", r.done === r.total ? "font-semibold text-success" : "text-muted-foreground")}>
              {r.done === r.total ? "모두 채웠어요" : `필수 ${r.done}/${r.total}개 완료`}
            </p>
          </div>
        </div>
        <button type="button" onClick={onSample} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
          <Wand2 aria-hidden className="size-4" /> 예시 값으로 채우기
        </button>
      </header>

      <SubSection title={`${GROUP_LABEL[group]} 설명`} done={count(desc)} total={desc.length}>
        <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
          {group === "dataset" ? (
            <DatasetFields inst={inst} form={state.dataset} ctx={ctx} onChange={(dataset) => onPatch({ dataset })} />
          ) : (
            <ModelFields
              inst={inst}
              form={state.model}
              ctx={ctx}
              onChange={(model) => onPatch({ model })}
              onAssetType={(assetType) =>
                onPatch((s) => {
                  const nextFiles = { ...s.files }
                  delete nextFiles.model
                  return { model: { ...s.model, assetType, artifactReference: "", dependencyReference: "" }, files: nextFiles }
                })
              }
            />
          )}
        </div>
      </SubSection>

      <SubSection tinted title={group === "model" ? "모델 파일과 참조" : "데이터셋 파일"} done={count(files)} total={files.length}>
        <FileOrReference inst={inst} group={group} state={state} ctx={ctx} onPatch={onPatch} />
      </SubSection>
    </section>
  )
}

function SubSection({ title, done, total, tinted, children }: { title: string; done: number; total: number; tinted?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-5 px-5 py-6 md:px-7", tinted && "border-t border-border bg-muted/40")}>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-base font-semibold">{title}</h4>
        <span className={cn("text-sm tabular-nums", done === total ? "font-semibold text-success" : "text-muted-foreground")}>
          {done}/{total}
        </span>
      </div>
      {children}
    </div>
  )
}

function DatasetFields({ inst, form, ctx, onChange }: { inst: HubInstance; form: DatasetForm; ctx: FieldCtx; onChange: (f: DatasetForm) => void }) {
  const id = (k: string) => fieldId(inst.id, "dataset", k)
  const category = datasetCategory(inst)
  const details = DETAIL_TYPES_BY_CATEGORY[category] ?? DETAIL_TYPES_BY_CATEGORY["기타 데이터"]
  return (
    <>
      <TextField className="md:col-span-2" id={id("title")} k="title" label="제목" ctx={ctx} value={form.title} placeholder="예: 용접 비드 이미지 6천 장" onChange={(title) => onChange({ ...form, title })} />
      <SelectField id={id("detailType")} k="detailType" label="세부 유형" ctx={ctx} value={form.detailType} options={details} hint={`${category}에 맞는 유형만 보여요.`} onChange={(detailType) => onChange({ ...form, detailType })} />
      <SelectField id={id("task")} k="task" label="적용 Task" ctx={ctx} value={form.task} options={TASK_TYPES} onChange={(task) => onChange({ ...form, task })} />
      <SummaryField className="md:col-span-2" id={id("summary")} ctx={ctx} value={form.summary} placeholder="어떤 데이터이고 어디에 쓰는지 적어 주세요" onChange={(summary) => onChange({ ...form, summary })} />
      <KeywordField id={id("keywords")} ctx={ctx} value={form.keywords} onChange={(keywords) => onChange({ ...form, keywords })} />
      <VisibilityField id={id("visibility")} value={form.visibility} onChange={(visibility) => onChange({ ...form, visibility })} />
    </>
  )
}

function ModelFields({ inst, form, ctx, onChange, onAssetType }: { inst: HubInstance; form: ModelForm; ctx: FieldCtx; onChange: (f: ModelForm) => void; onAssetType: (t: ModelAssetType) => void }) {
  const id = (k: string) => fieldId(inst.id, "model", k)
  return (
    <>
      <TextField className="md:col-span-2" id={id("title")} k="title" label="제목" ctx={ctx} value={form.title} placeholder="예: 용접 비드 불량 분류 v1" onChange={(title) => onChange({ ...form, title })} />
      <Field id={id("assetType")} label="모델 자산 유형" done hint="고른 유형에 맞게 아래 파일 칸이 바뀌어요.">
        <select id={id("assetType")} value={form.assetType} aria-describedby={`${id("assetType")}-hint`} onChange={(e) => onAssetType(e.target.value as ModelAssetType)} className={cn(controlClass(false), "h-11")}>
          {MODEL_ASSET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} · {o.examples}
            </option>
          ))}
        </select>
      </Field>
      <SelectField
        id={id("task")}
        k="task"
        label="적용 Task"
        ctx={ctx}
        value={form.task}
        options={TASK_TYPES}
        hint={inst.imported.hubTask ? `Model Hub에는 ${inst.imported.hubTask}로 적혀 있어요.` : undefined}
        onChange={(task) => onChange({ ...form, task })}
      />
      <SummaryField className="md:col-span-2" id={id("summary")} ctx={ctx} value={form.summary} placeholder="무엇을 판단하는 모델이고 어디에 쓰는지 적어 주세요" onChange={(summary) => onChange({ ...form, summary })} />
      <KeywordField id={id("keywords")} ctx={ctx} value={form.keywords} onChange={(keywords) => onChange({ ...form, keywords })} />
      <VisibilityField id={id("visibility")} value={form.visibility} onChange={(visibility) => onChange({ ...form, visibility })} />
    </>
  )
}

function FileOrReference({ inst, group, state, ctx, onPatch }: { inst: HubInstance; group: Group; state: AssetState; ctx: FieldCtx; onPatch: (n: Patch) => void }) {
  const id = (k: string) => fieldId(inst.id, group, k)
  const setFile = (f: AttachedFile | null) => {
    onPatch((s) => {
      const files = { ...s.files }
      if (f) files[group] = f
      else delete files[group]
      return { files }
    })
    ctx.onTouch("file")
  }

  if (group === "dataset") {
    return (
      <FileField
        id={id("file")}
        label="데이터셋 파일"
        accept={DATASET_ACCEPT}
        typesLabel="ZIP·TAR 압축 패키지, CSV·Parquet·JSON, 이미지, 오디오, 영상, NumPy"
        file={state.files.dataset}
        error={ctx.err("file")}
        onChange={setFile}
      />
    )
  }

  const opt = assetOption(state.model.assetType)
  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-start gap-2.5 rounded-lg bg-card px-4 py-3 text-[15px] leading-relaxed ring-1 ring-border">
        <Info aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
        <span>
          <span className="font-semibold">{opt.label}</span> · {opt.description}
        </span>
      </p>
      {opt.source === "file" ? (
        <FileField
          key={opt.value}
          id={id("file")}
          label={`모델 ${opt.label} 파일`}
          accept={opt.accept ?? ""}
          typesLabel={(opt.accept ?? "").split(",").join(" · ")}
          file={state.files.model}
          error={ctx.err("file")}
          onChange={setFile}
        />
      ) : (
        <ReferenceField id={id("artifactReference")} k="artifactReference" label={opt.referenceLabel ?? "모델 참조"} ctx={ctx} value={state.model.artifactReference} placeholder={opt.referencePlaceholder} onChange={(artifactReference) => onPatch((s) => ({ model: { ...s.model, artifactReference } }))} />
      )}
      {opt.dependencyLabel ? (
        <ReferenceField
          id={id("dependencyReference")}
          k="dependencyReference"
          label={opt.dependencyLabel}
          ctx={ctx}
          value={state.model.dependencyReference}
          placeholder={opt.dependencyPlaceholder}
          hint={opt.value === "weights" ? "가중치만으로는 실행할 수 없어서, 불러올 구조·코드 위치가 필요해요." : undefined}
          onChange={(dependencyReference) => onPatch((s) => ({ model: { ...s.model, dependencyReference } }))}
        />
      ) : null}
    </div>
  )
}

function ReferenceField({ id, k, label, ctx, value, placeholder, hint, onChange }: { id: string; k: string; label: string; ctx: FieldCtx; value: string; placeholder?: string; hint?: string; onChange: (v: string) => void }) {
  const error = ctx.err(k)
  return (
    <Field id={id} label={label} done={ctx.done(k)} error={error} hint={hint}>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        onBlur={() => ctx.onTouch(k)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass(!!error), "h-11 font-mono text-sm")}
      />
    </Field>
  )
}

function TextField({ id, k, label, ctx, value, placeholder, className, onChange }: { id: string; k: string; label: string; ctx: FieldCtx; value: string; placeholder: string; className?: string; onChange: (v: string) => void }) {
  const error = ctx.err(k)
  return (
    <Field id={id} label={label} done={ctx.done(k)} error={error} className={className}>
      <input
        id={id}
        value={value}
        maxLength={120}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error)}
        onBlur={() => ctx.onTouch(k)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass(!!error), "h-11")}
      />
    </Field>
  )
}

function SelectField({ id, k, label, ctx, value, options, hint, onChange }: { id: string; k: string; label: string; ctx: FieldCtx; value: string; options: readonly string[]; hint?: string; onChange: (v: string) => void }) {
  const error = ctx.err(k)
  return (
    <Field id={id} label={label} done={ctx.done(k)} error={error} hint={hint}>
      <select
        id={id}
        value={value}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        onBlur={() => ctx.onTouch(k)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass(!!error), "h-11", !value && "text-muted-foreground")}
      >
        <option value="" disabled>
          선택해 주세요
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="text-foreground">
            {o}
          </option>
        ))}
      </select>
    </Field>
  )
}

function VisibilityField({ id, value, onChange }: { id: string; value: Visibility; onChange: (v: Visibility) => void }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="sr-only">공개 범위 (필수, 완료)</legend>
      <div aria-hidden>
        <FieldHead label="공개 범위" done />
      </div>
      <div className="grid h-11 grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {VISIBILITY_OPTIONS.map((o) => (
          <label
            key={o}
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-md text-[15px] font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === o ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <input type="radio" name={id} value={o} checked={value === o} onChange={() => onChange(o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{value === "공개" ? "누구나 찾아보고 쓸 수 있어요." : "나와 관리자만 볼 수 있어요."}</p>
    </fieldset>
  )
}

function SummaryField({ id, ctx, value, placeholder, className, onChange }: { id: string; ctx: FieldCtx; value: string; placeholder: string; className?: string; onChange: (v: string) => void }) {
  const error = ctx.err("summary")
  return (
    <Field id={id} label="개요" done={ctx.done("summary")} error={error} className={className}>
      <textarea
        id={id}
        value={value}
        rows={3}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error)}
        onBlur={() => ctx.onTouch("summary")}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass(!!error), "resize-y py-3 leading-relaxed")}
      />
    </Field>
  )
}

function KeywordField({ id, ctx, value, onChange }: { id: string; ctx: FieldCtx; value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("")
  const error = ctx.err("keywords")
  const add = (word: string) => {
    const w = word.trim().replace(/,$/, "")
    if (w && !value.includes(w)) onChange([...value, w])
    setDraft("")
  }
  const suggestions = KEYWORD_SUGGESTIONS.filter((s) => !value.includes(s))
  return (
    <Field id={id} label="키워드" done={ctx.done("keywords")} error={error} hint="입력 후 Enter로 추가해요.">
      <div className={cn(controlClass(!!error), "flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40")}>
        {value.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 rounded-md bg-primary/10 py-1 pl-2.5 pr-1 text-sm font-medium text-primary">
            {k}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== k))} aria-label={`키워드 ${k} 빼기`} className="rounded p-0.5 hover:bg-primary/15">
              <X aria-hidden className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, true)}
          placeholder={value.length ? "" : "예: 검사, 불량"}
          onBlur={() => {
            if (draft.trim()) add(draft)
            ctx.onTouch("keywords")
          }}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === "Enter") {
              e.preventDefault()
              add(draft)
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1))
          }}
          className="h-8 min-w-24 flex-1 bg-transparent px-1.5 text-[15px] outline-none"
        />
      </div>
      {suggestions.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onChange([...value, s])} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-sm hover:bg-muted">
              <Plus aria-hidden className="size-3" /> {s}
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  )
}

const UPLOAD_MS = 900

function FileField({ id, label, accept, typesLabel, file, error, onChange }: { id: string; label: string; accept: string; typesLabel: string; file?: AttachedFile; error?: string; onChange: (f: AttachedFile | null) => void }) {
  const pickerId = useId()
  const [typeError, setTypeError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const shown = typeError ?? (file ? undefined : error)
  const status = uploading ? "uploading" : file ? "done" : shown ? "error" : "empty"

  const take = (f: File | undefined) => {
    if (!f) return
    if (!accepts(accept, f.name)) {
      setTypeError(`${f.name}은(는) 올릴 수 없는 형식이에요. 지원 형식을 확인해 주세요.`)
      return
    }
    setTypeError(null)
    setUploading(f.name)
    timer.current = setTimeout(() => {
      setUploading(null)
      onChange({ name: f.name, size: f.size })
    }, UPLOAD_MS)
  }

  const tile = {
    empty: "bg-primary/10 text-primary",
    uploading: "bg-primary/10 text-primary",
    done: "bg-success text-success-foreground",
    error: "bg-destructive/10 text-destructive",
  }[status]
  const TileIcon = status === "uploading" ? Loader2 : status === "done" ? Check : status === "error" ? AlertTriangle : FileUp

  return (
    <div role="group" aria-labelledby={`${id}-label`} className="flex flex-col gap-2">
      <FieldHead id={`${id}-label`} label={label} done={status === "done"} />
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!file) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!file) take(e.dataTransfer.files[0])
        }}
        className={cn(
          "flex flex-col gap-4 rounded-xl border-2 p-4 transition-colors sm:flex-row sm:items-center md:p-5",
          status === "done"
            ? "border-success/40 bg-success/5"
            : status === "error"
              ? "border-dashed border-destructive/60 bg-destructive/5"
              : dragging || status === "uploading"
                ? "border-dashed border-primary bg-primary/5"
                : "border-dashed border-border bg-card",
        )}
      >
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", tile)}>
          <TileIcon aria-hidden className={cn("size-6", status === "uploading" && "animate-spin")} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1" aria-live="polite">
          <p className="truncate text-base font-semibold">
            {status === "done" ? file!.name : status === "uploading" ? uploading : dragging ? "여기에 놓으세요" : "아직 올린 파일이 없어요"}
          </p>
          {status === "done" ? (
            <p className="text-sm text-muted-foreground tabular-nums">{formatSize(file!.size)} · 올림 완료</p>
          ) : status === "uploading" ? (
            <>
              <p className="text-sm text-muted-foreground">올리는 중…</p>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </span>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">지원 형식</span> {typesLabel}
            </p>
          )}
        </div>
        {status === "done" ? (
          <button id={id} type="button" onClick={() => onChange(null)} className="shrink-0 self-start rounded-lg border border-border bg-card px-4 py-2 text-[15px] font-semibold hover:bg-muted sm:self-center">
            다른 파일로 바꾸기
          </button>
        ) : (
          <label
            htmlFor={id}
            className={cn(
              "shrink-0 cursor-pointer self-start rounded-lg bg-primary px-4 py-2.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 sm:self-center",
              status === "uploading" && "pointer-events-none opacity-60",
            )}
          >
            파일 고르기
            <input
              id={id}
              type="file"
              accept={accept}
              disabled={status === "uploading"}
              className="sr-only"
              aria-labelledby={`${id}-label ${pickerId}`}
              aria-invalid={!!shown}
              aria-describedby={shown ? `${id}-error` : undefined}
              onChange={(e) => {
                take(e.target.files?.[0])
                e.target.value = ""
              }}
            />
            <span id={pickerId} className="sr-only">
              파일 고르기
            </span>
          </label>
        )}
      </div>
      {shown ? <FieldError id={`${id}-error`}>{shown}</FieldError> : null}
    </div>
  )
}

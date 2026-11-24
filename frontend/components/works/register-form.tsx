"use client"

import { AlertTriangle, Boxes, Check, Database, FileUp, Info, Lock, Plus, Wand2, X } from "lucide-react"
import { useId, useState } from "react"

import { cn } from "@/lib/utils"
import {
  datasetCategory,
  formatSize,
  GROUP_LABEL,
  readiness,
  type AssetState,
  type Group,
  type HubInstance,
} from "@/lib/works/hub-instances"
import {
  accepts,
  assetOption,
  DATASET_ACCEPT,
  DETAIL_TYPES_BY_CATEGORY,
  KEYWORD_SUGGESTIONS,
  MODEL_ASSET_OPTIONS,
  TASK_TYPES,
  VISIBILITY_OPTIONS,
  type AttachedFile,
  type DatasetForm,
  type ModelAssetType,
  type ModelForm,
  type Visibility,
} from "@/lib/works/register-fields"

export const fieldId = (instId: string, group: Group, key: string) => `${instId}-${group}-${key}`

const controlClass = (invalid: boolean) =>
  cn(
    "w-full rounded-lg border bg-card px-3.5 text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
    invalid ? "border-destructive" : "border-border",
  )

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
        {required ? (
          <>
            <span aria-hidden className="ml-1 text-destructive">
              *
            </span>
            <span className="sr-only"> (필수)</span>
          </>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertTriangle aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: unknown) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined
}

type GroupFormProps = {
  inst: HubInstance
  group: Group
  state: AssetState
  showError: (group: Group, key: string) => boolean
  onTouch: (group: Group, key: string) => void
  onPatch: (next: Partial<AssetState> | ((s: AssetState) => Partial<AssetState>)) => void
  onSample: () => void
}

export function AssetGroupForm({ inst, group, state, showError, onTouch, onPatch, onSample }: GroupFormProps) {
  const r = readiness(inst, state).groups.find((g) => g.group === group)!
  const err = (key: string) => (showError(group, key) ? r.errors[key] : undefined)
  const Icon = group === "model" ? Boxes : Database

  return (
    <section aria-labelledby={`${inst.id}-${group}-title`} className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon aria-hidden className="size-5" />
          </span>
          <div className="flex flex-col">
            <h3 id={`${inst.id}-${group}-title`} className="text-xl font-semibold">
              {GROUP_LABEL[group]} 정보
            </h3>
            <p className={cn("text-sm tabular-nums", r.done === r.total ? "font-semibold text-success" : "text-muted-foreground")}>
              필수 {r.total}개 중 {r.done}개 완료
            </p>
          </div>
        </div>
        <button type="button" onClick={onSample} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
          <Wand2 aria-hidden className="size-4" /> 예시 값으로 채우기
        </button>
      </header>

      <ImportedStrip inst={inst} group={group} />

      <div className="flex flex-col gap-6 px-6 py-6 md:px-8">
        <p className="text-sm font-semibold text-muted-foreground">직접 입력 · <span className="text-destructive">*</span> 표시는 필수예요</p>
        {group === "dataset" ? (
          <DatasetFields inst={inst} form={state.dataset} err={err} onTouch={(k) => onTouch(group, k)} onChange={(dataset) => onPatch({ dataset })} />
        ) : (
          <ModelFields
            inst={inst}
            form={state.model}
            err={err}
            onTouch={(k) => onTouch(group, k)}
            onChange={(model) => onPatch({ model })}
            onAssetType={(assetType) => {
              const files = { ...state.files }
              delete files.model
              onPatch({ model: { ...state.model, assetType, artifactReference: "", dependencyReference: "" }, files })
            }}
          />
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border bg-muted/30 px-6 py-6 md:px-8">
        <p className="text-sm font-semibold text-muted-foreground">올릴 파일</p>
        <FileOrReference inst={inst} group={group} state={state} err={err} onTouch={(k) => onTouch(group, k)} onPatch={onPatch} />
      </div>
    </section>
  )
}

function ImportedStrip({ inst, group }: { inst: HubInstance; group: Group }) {
  const items =
    group === "model"
      ? [
          { label: "작성자", value: inst.imported.author },
          { label: "버전", value: inst.imported.version },
          { label: "Framework", value: inst.imported.framework ?? "—" },
        ]
      : [
          { label: "작성자", value: inst.imported.author },
          { label: "버전", value: inst.imported.version },
          { label: "데이터 카테고리", value: datasetCategory(inst), note: `AAS Metadata.Filetype: ${inst.imported.datasetFileType ?? "—"}` },
        ]
  return (
    <div className="flex flex-col gap-3 bg-muted/40 px-6 py-4 md:px-8">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Lock aria-hidden className="size-3.5" /> Model Hub에서 가져온 정보 · 여기서는 바꿀 수 없어요
      </p>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">{it.label}</dt>
            <dd className="truncate text-[15px] font-semibold">{it.value}</dd>
            {"note" in it && it.note ? <dd className="font-mono text-xs text-muted-foreground">{it.note}</dd> : null}
          </div>
        ))}
      </dl>
    </div>
  )
}

type FieldsProps<T> = { inst: HubInstance; form: T; err: (k: string) => string | undefined; onTouch: (k: string) => void; onChange: (f: T) => void }

function DatasetFields({ inst, form, err, onTouch, onChange }: FieldsProps<DatasetForm>) {
  const id = (k: string) => fieldId(inst.id, "dataset", k)
  const category = datasetCategory(inst)
  const details = DETAIL_TYPES_BY_CATEGORY[category] ?? DETAIL_TYPES_BY_CATEGORY["기타 데이터"]
  return (
    <>
      <TitleField id={id("title")} value={form.title} error={err("title")} placeholder="데이터셋 제목을 입력해 주세요" onBlur={() => onTouch("title")} onChange={(title) => onChange({ ...form, title })} />
      <div className="grid gap-6 md:grid-cols-2">
        <SelectField
          id={id("detailType")}
          label="세부 유형"
          value={form.detailType}
          placeholder="세부 유형 선택"
          options={details}
          error={err("detailType")}
          hint={`${category}에 맞는 구체적인 성격을 골라 주세요.`}
          onBlur={() => onTouch("detailType")}
          onChange={(detailType) => onChange({ ...form, detailType })}
        />
        <SelectField
          id={id("task")}
          label="적용 Task"
          value={form.task}
          placeholder="Task 선택"
          options={TASK_TYPES}
          error={err("task")}
          onBlur={() => onTouch("task")}
          onChange={(task) => onChange({ ...form, task })}
        />
      </div>
      <VisibilityField id={id("visibility")} value={form.visibility} onChange={(visibility) => onChange({ ...form, visibility })} />
      <SummaryField id={id("summary")} value={form.summary} error={err("summary")} placeholder="데이터셋의 내용과 활용 목적을 설명해 주세요" onBlur={() => onTouch("summary")} onChange={(summary) => onChange({ ...form, summary })} />
      <KeywordField id={id("keywords")} value={form.keywords} error={err("keywords")} onBlur={() => onTouch("keywords")} onChange={(keywords) => onChange({ ...form, keywords })} />
    </>
  )
}

function ModelFields({ inst, form, err, onTouch, onChange, onAssetType }: FieldsProps<ModelForm> & { onAssetType: (t: ModelAssetType) => void }) {
  const id = (k: string) => fieldId(inst.id, "model", k)
  const opt = assetOption(form.assetType)
  return (
    <>
      <TitleField id={id("title")} value={form.title} error={err("title")} placeholder="모델 제목을 입력해 주세요" onBlur={() => onTouch("title")} onChange={(title) => onChange({ ...form, title })} />
      <Field id={id("assetType")} label="모델 자산 유형" required>
        <select id={id("assetType")} value={form.assetType} onChange={(e) => onAssetType(e.target.value as ModelAssetType)} className={cn(controlClass(false), "h-11")}>
          {MODEL_ASSET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} · {o.examples}
            </option>
          ))}
        </select>
        <div className="flex gap-3 rounded-xl bg-primary/5 px-4 py-3">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold">{opt.source === "file" ? opt.examples : `파일 대신 ${opt.referenceLabel}를 등록해요`}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{opt.description}</p>
          </div>
        </div>
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <SelectField
          id={id("task")}
          label="적용 Task"
          value={form.task}
          placeholder="Task 선택"
          options={TASK_TYPES}
          error={err("task")}
          hint={inst.imported.hubTask ? `Model Hub에는 ${inst.imported.hubTask}로 적혀 있어요.` : undefined}
          onBlur={() => onTouch("task")}
          onChange={(task) => onChange({ ...form, task })}
        />
        <VisibilityField id={id("visibility")} value={form.visibility} onChange={(visibility) => onChange({ ...form, visibility })} />
      </div>
      <SummaryField id={id("summary")} value={form.summary} error={err("summary")} placeholder="모델의 목적과 활용 방식을 설명해 주세요" onBlur={() => onTouch("summary")} onChange={(summary) => onChange({ ...form, summary })} />
      <KeywordField id={id("keywords")} value={form.keywords} error={err("keywords")} onBlur={() => onTouch("keywords")} onChange={(keywords) => onChange({ ...form, keywords })} />
    </>
  )
}

function FileOrReference({ inst, group, state, err, onTouch, onPatch }: { inst: HubInstance; group: Group; state: AssetState; err: (k: string) => string | undefined; onTouch: (k: string) => void; onPatch: GroupFormProps["onPatch"] }) {
  const id = (k: string) => fieldId(inst.id, group, k)
  const setFile = (f: AttachedFile | null) => {
    onPatch((s) => {
      const files = { ...s.files }
      if (f) files[group] = f
      else delete files[group]
      return { files }
    })
    onTouch("file")
  }

  if (group === "dataset") {
    return (
      <FileField
        id={id("file")}
        label="데이터셋 파일"
        accept={DATASET_ACCEPT}
        file={state.files.dataset}
        error={err("file")}
        hint="압축 패키지 또는 CSV, Parquet, JSON, 이미지, 오디오, 영상, NumPy 등 실제 데이터 파일을 올려 주세요."
        onChange={setFile}
      />
    )
  }

  const opt = assetOption(state.model.assetType)
  return (
    <>
      {opt.source === "file" ? (
        <FileField
          key={opt.value}
          id={id("file")}
          label={`${opt.label} 파일`}
          accept={opt.accept ?? ""}
          file={state.files.model}
          error={err("file")}
          hint={`지원 형식: ${opt.accept?.split(",").join(", ")}`}
          onChange={setFile}
        />
      ) : (
        <Field id={id("artifactReference")} label={opt.referenceLabel ?? "모델 참조"} required error={err("artifactReference")}>
          <input
            id={id("artifactReference")}
            value={state.model.artifactReference}
            placeholder={opt.referencePlaceholder}
            aria-invalid={!!err("artifactReference")}
            aria-describedby={describedBy(id("artifactReference"), err("artifactReference"))}
            onBlur={() => onTouch("artifactReference")}
            onChange={(e) => onPatch({ model: { ...state.model, artifactReference: e.target.value } })}
            className={cn(controlClass(!!err("artifactReference")), "h-11 font-mono text-sm")}
          />
        </Field>
      )}
      {opt.dependencyLabel ? (
        <Field
          id={id("dependencyReference")}
          label={opt.dependencyLabel}
          required
          error={err("dependencyReference")}
          hint={opt.value === "weights" ? "가중치 파일만으로는 추론할 수 없어요. 이 가중치를 불러올 모델 구조나 코드 위치를 적어 주세요." : undefined}
        >
          <input
            id={id("dependencyReference")}
            value={state.model.dependencyReference}
            placeholder={opt.dependencyPlaceholder}
            aria-invalid={!!err("dependencyReference")}
            aria-describedby={describedBy(id("dependencyReference"), err("dependencyReference"), opt.value === "weights")}
            onBlur={() => onTouch("dependencyReference")}
            onChange={(e) => onPatch({ model: { ...state.model, dependencyReference: e.target.value } })}
            className={cn(controlClass(!!err("dependencyReference")), "h-11 font-mono text-sm")}
          />
        </Field>
      ) : null}
    </>
  )
}

function TitleField({ id, value, error, placeholder, onChange, onBlur }: { id: string; value: string; error?: string; placeholder: string; onChange: (v: string) => void; onBlur: () => void }) {
  return (
    <Field id={id} label="제목" required error={error}>
      <input
        id={id}
        value={value}
        maxLength={120}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error)}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass(!!error), "h-11")}
      />
    </Field>
  )
}

function SelectField({
  id,
  label,
  value,
  placeholder,
  options,
  error,
  hint,
  onChange,
  onBlur,
}: {
  id: string
  label: string
  value: string
  placeholder: string
  options: readonly string[]
  error?: string
  hint?: string
  onChange: (v: string) => void
  onBlur: () => void
}) {
  return (
    <Field id={id} label={label} required error={error} hint={hint}>
      <select
        id={id}
        value={value}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass(!!error), "h-11", !value && "text-muted-foreground")}
      >
        <option value="" disabled>
          {placeholder}
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
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[15px] font-semibold">
        공개 범위
        <span aria-hidden className="ml-1 text-destructive">
          *
        </span>
        <span className="sr-only"> (필수)</span>
      </legend>
      <div className="grid h-11 grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {VISIBILITY_OPTIONS.map((o) => (
          <label
            key={o}
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-md text-[15px] font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === o ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            <input type="radio" name={id} value={o} checked={value === o} onChange={() => onChange(o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function SummaryField({ id, value, error, placeholder, onChange, onBlur }: { id: string; value: string; error?: string; placeholder: string; onChange: (v: string) => void; onBlur: () => void }) {
  return (
    <Field id={id} label="개요" required error={error}>
      <textarea
        id={id}
        value={value}
        rows={4}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error)}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass(!!error), "resize-y py-3 leading-relaxed")}
      />
    </Field>
  )
}

function KeywordField({ id, value, error, onChange, onBlur }: { id: string; value: string[]; error?: string; onChange: (v: string[]) => void; onBlur: () => void }) {
  const [draft, setDraft] = useState("")
  const add = (word: string) => {
    const w = word.trim().replace(/,$/, "")
    if (w && !value.includes(w)) onChange([...value, w])
    setDraft("")
  }
  const suggestions = KEYWORD_SUGGESTIONS.filter((s) => !value.includes(s))
  return (
    <Field id={id} label="키워드" required error={error} hint="단어를 입력하고 Enter를 누르거나, 아래 키워드를 눌러 추가하세요.">
      <div className={cn(controlClass(!!error), "flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring")}>
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
          placeholder={value.length ? "" : "단어를 입력하거나 기존 키워드를 선택하세요"}
          onBlur={() => {
            if (draft.trim()) add(draft)
            onBlur()
          }}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === "Enter") {
              e.preventDefault()
              add(draft)
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1))
          }}
          className="h-8 min-w-32 flex-1 bg-transparent px-1.5 text-[15px] outline-none"
        />
      </div>
      {suggestions.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onChange([...value, s])} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-sm hover:bg-muted">
              <Plus aria-hidden className="size-3" /> {s}
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  )
}

function FileField({ id, label, accept, file, error, hint, onChange }: { id: string; label: string; accept: string; file?: AttachedFile; error?: string; hint: string; onChange: (f: AttachedFile | null) => void }) {
  const inputId = useId()
  const [typeError, setTypeError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const shown = typeError ?? error

  const take = (f: File | undefined) => {
    if (!f) return
    if (!accepts(accept, f.name)) {
      setTypeError(`지원하지 않는 형식이에요 (${f.name}). ${accept.split(",").join(", ")} 중 하나를 올려 주세요.`)
      return
    }
    setTypeError(null)
    onChange({ name: f.name, size: f.size })
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[15px] font-semibold">
        {label}
        <span aria-hidden className="ml-1 text-destructive">
          *
        </span>
        <span className="sr-only"> (필수)</span>
      </p>
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-success/10 px-4 py-3">
          <span className="flex min-w-0 items-center gap-3">
            <Check aria-hidden className="size-5 shrink-0 text-success" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{file.name}</span>
              <span className="text-sm text-muted-foreground">{formatSize(file.size)} · 올림</span>
            </span>
          </span>
          <button id={id} type="button" onClick={() => onChange(null)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-card">
            다른 파일로 바꾸기
          </button>
        </div>
      ) : (
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
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed px-4 py-4",
            shown ? "border-destructive/60 bg-destructive/5" : dragging ? "border-primary bg-primary/5" : "border-border bg-card",
          )}
        >
          <span className="flex items-center gap-3 text-[15px] font-medium">
            <FileUp aria-hidden className="size-5 text-primary" />
            {dragging ? "여기에 놓으세요" : "파일을 끌어 놓거나 골라 주세요"}
          </span>
          <label
            htmlFor={inputId}
            className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-[15px] font-semibold hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            찾아보기
            <input
              id={inputId}
              type="file"
              accept={accept}
              className="sr-only"
              aria-describedby={`${id}-msg`}
              onChange={(e) => {
                take(e.target.files?.[0])
                e.target.value = ""
              }}
            />
          </label>
          <span id={id} tabIndex={-1} className="sr-only">
            {label}
          </span>
        </div>
      )}
      <p id={`${id}-msg`} className={cn("flex items-start gap-1.5 text-sm leading-relaxed", shown ? "font-medium text-destructive" : "text-muted-foreground")}>
        {shown ? <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" /> : null}
        {shown ?? hint}
      </p>
    </div>
  )
}

"use client"

import { FileText, Info, Layers, Link2, MousePointerClick } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { TreeNode } from "@/lib/aas/aas-types"
import { cn } from "@/lib/utils"

/** Node types that carry a scalar value worth editing. */
const VALUE_TYPES = new Set([
  "Property",
  "MultiLanguageProperty",
  "File",
  "Blob",
  "Range",
  "ReferenceElement",
  "RelationshipElement",
  "Attribute",
  "Reference",
])

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Info
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="size-3.5 text-primary" />
      {children}
    </div>
  )
}

function Field({
  label,
  value,
  editable,
  mono,
  placeholder,
  onChange,
}: {
  label: string
  value?: string
  editable?: boolean
  mono?: boolean
  placeholder?: string
  onChange?: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <Input
        value={value ?? ""}
        readOnly={!editable}
        placeholder={placeholder ?? (editable ? "" : "—")}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={cn(
          mono && "font-mono text-xs",
          !editable && "cursor-default bg-muted/40 text-foreground/90 focus-visible:ring-0",
        )}
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  editable,
  onChange,
}: {
  label: string
  value?: string
  editable?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <textarea
        value={value ?? ""}
        readOnly={!editable}
        rows={3}
        placeholder={editable ? "" : "—"}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={cn(
          "w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          !editable && "cursor-default bg-muted/40 text-foreground/90 focus-visible:ring-0",
        )}
      />
    </div>
  )
}

export function AasPropertyPanel({
  node,
  editable = false,
  onChange,
}: {
  node: TreeNode | null
  editable?: boolean
  onChange?: (patch: Partial<TreeNode>) => void
}) {
  if (!node) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MousePointerClick className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground text-pretty">
          왼쪽 트리에서 노드를 선택하면
          <br />
          상세 속성이 표시됩니다.
        </p>
      </div>
    )
  }

  const hasValue = VALUE_TYPES.has(node.type)
  const childCount = node.children?.length ?? 0
  const patch = (p: Partial<TreeNode>) => onChange?.(p)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold">{node.label}</h4>
          <Badge variant="secondary" className="text-[10px]">
            {node.type}
          </Badge>
        </div>
      </div>

      {/* Property */}
      <div className="flex flex-col gap-3">
        <SectionLabel icon={Info}>Property</SectionLabel>
        <Field
          label="idShort"
          value={node.idShort ?? node.label}
          editable={editable}
          onChange={(v) => patch({ idShort: v, label: v })}
        />
        {node.externalId && <Field label="id" value={node.externalId} mono />}
        {node.modelType && <Field label="modelType" value={node.modelType} mono />}
        {node.valuePath && <Field label="valuePath" value={node.valuePath} mono />}
        {(node.valueType || editable) && hasValue && node.type !== "File" && (
          <Field
            label="valueType"
            value={node.valueType}
            editable={editable}
            mono
            placeholder="xs:string"
            onChange={(v) => patch({ valueType: v })}
          />
        )}
        {node.type === "File" && (
          <Field
            label="contentType"
            value={node.contentType}
            editable={editable}
            mono
            onChange={(v) => patch({ contentType: v, badge: v })}
          />
        )}
        {hasValue && (
          <Field
            label="value"
            value={node.value}
            editable={editable}
            mono
            onChange={(v) => patch({ value: v })}
          />
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-3">
        <SectionLabel icon={FileText}>Description</SectionLabel>
        {node.language !== undefined || node.type === "MultiLanguageProperty" ? (
          <Field
            label="language"
            value={node.language}
            editable={editable}
            placeholder="ko"
            onChange={(v) => patch({ language: v })}
          />
        ) : null}
        <TextAreaField
          label="text"
          value={node.description}
          editable={editable}
          onChange={(v) => patch({ description: v })}
        />
      </div>

      {/* semanticId (read-only reference) */}
      <div className="flex flex-col gap-3">
        <SectionLabel icon={Link2}>semanticId</SectionLabel>
        <Field label="type" value={node.semanticId?.type} mono />
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">keys</label>
          {node.semanticId?.keys && node.semanticId.keys.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {node.semanticId.keys.map((key, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5"
                >
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {key.type ?? "Key"}
                  </Badge>
                  <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                    {key.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground">
              등록된 semanticId가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Children summary for collections */}
      {childCount > 0 && (
        <div className="flex flex-col gap-3">
          <SectionLabel icon={Layers}>Child Elements</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {node.children!.map((child) => (
              <div
                key={child.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5"
              >
                <span className="min-w-0 truncate text-xs font-medium">{child.label}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  {child.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

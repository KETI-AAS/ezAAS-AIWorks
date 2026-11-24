"use client"

import { ChevronDown, FlaskConical, Minus, Plus } from "lucide-react"
import { useState } from "react"

import { ConceptAssets } from "@/components/concepts/concept-assets"
import { ConceptGuided } from "@/components/concepts/concept-guided"
import { comparisonRows, conceptNotes } from "@/components/concepts/concept-notes"
import { ConceptWorkspace } from "@/components/concepts/concept-workspace"
import type { ConceptId, ConceptScreen } from "@/lib/concept-sample"
import { cn } from "@/lib/utils"

const screens: { id: ConceptScreen; label: string }[] = [
  { id: "register", label: "① 자산 등록" },
  { id: "verify", label: "② 검증 결과 · 다음 행동" },
]

export function ConceptLab() {
  const [concept, setConcept] = useState<ConceptId>("a")
  const [screen, setScreen] = useState<ConceptScreen>("register")
  const [notesOpen, setNotesOpen] = useState(true)
  const note = conceptNotes.find((n) => n.id === concept)!

  return (
    <div className="min-h-svh bg-muted text-foreground">
      <header className="sticky top-0 z-20 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">AI Works V2 · 구조 시안 비교</span>
            <span className="text-xs text-sidebar-foreground/60">같은 자산 · 같은 상태를 세 가지 구조로</span>
          </div>

          <div role="radiogroup" aria-label="디자인 방향" className="flex rounded-lg bg-sidebar-accent p-1">
            {conceptNotes.map((n) => (
              <button
                key={n.id}
                type="button"
                role="radio"
                aria-checked={concept === n.id}
                onClick={() => setConcept(n.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  concept === n.id
                    ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70",
                )}
              >
                {n.letter}. {n.name}
              </button>
            ))}
          </div>

          <div role="radiogroup" aria-label="비교 화면" className="flex rounded-lg bg-sidebar-accent p-1">
            {screens.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={screen === s.id}
                onClick={() => setScreen(s.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  screen === s.id
                    ? "bg-sidebar font-medium text-sidebar-foreground"
                    : "text-sidebar-foreground/70",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-warning/60 px-2.5 py-1 text-xs text-warning">
            <FlaskConical aria-hidden className="size-3.5" /> 시연용 샘플 데이터
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <section aria-labelledby="note-title" className="rounded-lg border border-border bg-card">
          <button
            type="button"
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left"
          >
            <span className="flex flex-col">
              <span id="note-title" className="font-semibold">
                {note.letter}. {note.name}
              </span>
              <span className="text-sm text-muted-foreground">{note.tagline}</span>
            </span>
            <ChevronDown
              aria-hidden
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", notesOpen && "rotate-180")}
            />
          </button>
          {notesOpen && (
            <div className="grid gap-6 border-t border-border px-5 py-4 text-sm md:grid-cols-3">
              <NoteColumn title="기존 UI와 구조적으로 달라진 점" items={note.structural} />
              <NoteColumn title="현업 사용자가 더 쉽게 이해하는 이유" items={note.whyEasier} />
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-muted-foreground">다른 방향과 비교한 장단점</h3>
                <ul className="flex flex-col gap-1.5 leading-relaxed">
                  {note.pros.map((p) => (
                    <li key={p} className="flex gap-2">
                      <Plus aria-label="장점" className="mt-1 size-3.5 shrink-0 text-success" />
                      {p}
                    </li>
                  ))}
                  {note.cons.map((c) => (
                    <li key={c} className="flex gap-2">
                      <Minus aria-label="불편한 점" className="mt-1 size-3.5 shrink-0 text-destructive" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <div
          className="h-[820px] overflow-hidden rounded-lg border border-border shadow-sm"
          aria-label={`${note.name} 시안 미리보기`}
        >
          {concept === "a" && <ConceptWorkspace screen={screen} />}
          {concept === "b" && <ConceptGuided screen={screen} />}
          {concept === "c" && <ConceptAssets screen={screen} />}
        </div>

        <section aria-labelledby="compare-title" className="flex flex-col gap-3">
          <h2 id="compare-title" className="font-semibold">
            세 방향의 구조 비교
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">구분</th>
                  {conceptNotes.map((n) => (
                    <th
                      key={n.id}
                      className={cn("px-4 py-2 font-normal", concept === n.id && "font-medium text-foreground")}
                    >
                      {n.letter}. {n.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((r) => (
                  <tr key={r.aspect} className="border-t border-border">
                    <th scope="row" className="px-4 py-2.5 text-left font-medium">
                      {r.aspect}
                    </th>
                    {(["a", "b", "c"] as const).map((k) => (
                      <td
                        key={k}
                        className={cn("px-4 py-2.5 text-muted-foreground", concept === k && "bg-accent/50 text-foreground")}
                      >
                        {r[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function NoteColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-4 leading-relaxed">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

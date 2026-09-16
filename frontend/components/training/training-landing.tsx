"use client"

import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Cpu,
  Database,
  Factory,
  FileSpreadsheet,
  Play,
  Sparkles,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const heroBadges = [
  "코딩 없이 데이터 학습 가능",
  "AAS 기반 데이터 연계",
  "실제 데이터로 성능 검증",
]

const heroMetrics = [
  { label: "Accuracy", value: "0.931" },
  { label: "Precision", value: "0.928" },
  { label: "Recall", value: "0.921" },
]

const audiences = [
  {
    icon: Factory,
    title: "제조 현장 실무자",
    description: "전문 지식 없이도 내 데이터를 활용해 AI 모델을 학습하고 싶은 분",
  },
  {
    icon: Database,
    title: "데이터 담당자",
    description: "다양한 형식의 레거시 데이터를 모델에 맞게 전처리하고 연결하고 싶은 분",
  },
  {
    icon: Cpu,
    title: "AI 모델 활용자",
    description: "보유한 AI 모델을 실제 현장 데이터로 재학습하여 성능을 개선하고 싶은 분",
  },
  {
    icon: Users,
    title: "PoC/연구자",
    description: "데이터-모델 연계를 빠르게 검증하고 실험해보고 싶은 분",
  },
]

const previews = [
  { step: "1", title: "데이터 업로드 및 미리보기", render: <UploadPreview /> },
  { step: "2", title: "Semantic Mapping (컬럼 연결)", render: <MappingPreview /> },
  { step: "3", title: "모델 학습 및 성능 확인", render: <TrainingPreview /> },
]

export function TrainingLanding() {
  const router = useRouter()

  const start = () => router.push("/training/start")

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 md:px-8 md:py-12">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary">
            <Sparkles className="size-4" />
            AI Training
          </span>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            내 데이터를 AI 모델에,
            <br />
            <span className="text-primary">더 쉽고 빠르게.</span>
          </h1>
          <p className="max-w-xl text-pretty text-base leading-7 text-muted-foreground">
            보유한 제조 현장의 레거시 데이터를 등록된 AI 모델과 연결하여 데이터 전처리부터 추가
            학습, 성능 확인까지 한 번에 진행할 수 있습니다.
          </p>
          <ul className="flex flex-wrap gap-2.5">
            {heroBadges.map((badge) => (
              <li
                key={badge}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium"
              >
                <CheckCircle2 className="size-4 text-primary" />
                {badge}
              </li>
            ))}
          </ul>
        </div>

        <HeroIllustration />
      </section>

      {/* Audiences */}
      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">이런 분들께 추천합니다</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Preview */}
      <section className="flex flex-col gap-6 rounded-3xl bg-primary/5 p-6 md:p-10">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">실제 화면 미리보기</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            직관적인 인터페이스로 단계별로 진행할 수 있습니다.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {previews.map((preview) => (
            <div key={preview.step} className="flex flex-col gap-3">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm">
                {preview.render}
              </div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {preview.step}
                </span>
                {preview.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-4 pb-4 text-center">
        <Button
          size="lg"
          onClick={start}
          className="h-14 gap-3 rounded-2xl px-10 text-base font-semibold"
        >
          <Play className="size-5 fill-current" />
          내 데이터로 학습시켜보기
          <ArrowRight className="size-5" />
        </Button>
        <p className="text-sm text-muted-foreground">
          지금 바로 데이터를 업로드하고 AI 모델 학습을 시작해보세요.
        </p>
      </section>
    </div>
  )
}

function HeroIllustration() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-3xl border border-border bg-gradient-to-b from-primary/5 to-transparent p-5 md:gap-4 md:p-8">
      {/* Your Data */}
      <IllustrationNode label="내 데이터">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileSpreadsheet className="size-7" />
        </span>
        <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          CSV
        </span>
      </IllustrationNode>

      <ArrowRight className="size-5 shrink-0 text-primary/60" />

      {/* AI Training */}
      <div className="flex flex-col items-center gap-2">
        <span className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Brain className="size-9" />
        </span>
        <span className="text-xs font-semibold text-primary">AI Training</span>
      </div>

      <ArrowRight className="size-5 shrink-0 text-primary/60" />

      {/* Trained Model */}
      <div className="flex flex-col items-center gap-2">
        <IllustrationNode label="향상된 모델">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="size-7" />
          </span>
        </IllustrationNode>
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
          {heroMetrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between gap-4 text-[11px]">
              <span className="text-muted-foreground">{metric.label}</span>
              <span className="font-semibold tabular-nums">{metric.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IllustrationNode({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-col items-center gap-1.5">{children}</div>
    </div>
  )
}

/* ---------- Mini preview mockups (decorative) ---------- */

function PreviewBar({ w, muted }: { w: string; muted?: boolean }) {
  return (
    <span
      className={cn("block h-2 rounded-full", muted ? "bg-muted" : "bg-primary/20")}
      style={{ width: w }}
    />
  )
}

function UploadPreview() {
  return (
    <div className="flex h-full flex-col gap-2" aria-hidden>
      <PreviewBar w="40%" />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileSpreadsheet className="size-4" />
        </span>
        <PreviewBar w="50%" muted />
      </div>
    </div>
  )
}

function MappingPreview() {
  return (
    <div className="flex h-full flex-col gap-2" aria-hidden>
      <PreviewBar w="45%" />
      <div className="flex flex-1 flex-col justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <PreviewBar w="30%" muted />
            <ArrowRight className="size-3 text-primary/50" />
            <PreviewBar w="30%" />
          </div>
        ))}
      </div>
    </div>
  )
}

function TrainingPreview() {
  return (
    <div className="flex h-full flex-col gap-2" aria-hidden>
      <div className="flex gap-2">
        {heroMetrics.map((m) => (
          <div key={m.label} className="flex flex-1 flex-col gap-1 rounded-md bg-primary/5 p-1.5">
            <PreviewBar w="60%" muted />
            <span className="text-[10px] font-semibold text-primary">{m.value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-1 items-end gap-1.5 rounded-lg bg-muted/50 p-2">
        {[35, 55, 45, 70, 65, 85, 80].map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-t bg-primary/40"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

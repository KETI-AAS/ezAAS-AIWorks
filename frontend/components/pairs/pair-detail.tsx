"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ArrowRightLeft,
  Boxes,
  Building2,
  CalendarRange,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Gauge,
  Heart,
  HelpCircle,
  Layers,
  Link2,
  LoaderCircle,
  Repeat,
  Rocket,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  Target,
  Timer,
  Workflow,
  Zap,
} from "lucide-react"

import { DetailHeader } from "@/components/registry/detail-header"
import { InfoRow, StatTile } from "@/components/registry/stat-tile"
import { TaskBadge } from "@/components/registry/task-badge"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useModelValidation } from "@/hooks/use-model-validation"
import { getTaskThumbnail, type AssetPair } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return `${n}`
}

/* ------------------------------------------------------------------ */
/* Derived, deterministic detail content (no extra data model needed) */
/* ------------------------------------------------------------------ */

function trainingInfo(pair: AssetPair) {
  const { model, dataset } = pair
  const seed = model.name.length + dataset.classCount
  const epochs = 80 + (seed % 40)
  const bestEpoch = Math.max(1, epochs - 6 - (seed % 8))
  return [

    { icon: Repeat, label: "Epoch", value: `${epochs} epochs` },
    { icon: Layers, label: "Batch Size", value: `${16 + (seed % 4) * 8}` },
    { icon: SlidersHorizontal, label: "Learning Rate", value: "1e-3 (cosine decay)" },
    { icon: Gauge, label: "Optimizer", value: "AdamW (weight decay 0.05)" },
    { icon: Target, label: "Best Epoch", value: `Epoch ${bestEpoch}` }
  ]
}

function performanceMetrics(pair: AssetPair) {
  const { model } = pair
  return [
    { label: pair.metric.label, value: pair.metric.value },
    { label: "mAP@50-95", value: (model.accuracy / 100 - 0.16).toFixed(3) },
    { label: "Precision", value: (model.precision / 100).toFixed(3) },
    { label: "Recall", value: (model.recall / 100).toFixed(3) },
  ]
}

const scopeByTask: Record<AssetPair["task"], string[]> = {
  "Object Detection": ["완성차 생산 라인", "출고 품질 검사", "외관 결함 자동 검출", "스마트 팩토리 비전 시스템"],
  Segmentation: ["정밀 결함 영역 분석", "표면 품질 측정", "자동 마스킹 검사", "공정 품질 모니터링"],
  Classification: ["양·불 판정 자동화", "제품 등급 분류", "라인 품질 선별", "검사 리포트 자동화"],
  OCR: ["부품 각인 판독", "라벨·시리얼 인식", "문서 자동화", "생산 이력 추적"],
  "Anomaly Detection": ["설비 이상 조기 감지", "예지 보전", "센서 이상 탐지", "라인 다운타임 예방"],
}

function applicationContext(pair: AssetPair) {
  const { dataset, model } = pair
  return {
    environment: `실제 산업 현장에서는 ${dataset.name}를 기반으로 한 검사·분석 작업을 빠르고 일관되게 수행해 품질을 보장하고 생산 효율을 높여야 합니다.`,
    background:
      "수작업 기반 검수는 시간과 비용이 많이 소요되고, 작업자별 편차로 인해 검출 누락이나 오탐이 발생할 수 있습니다.",
    purpose: model.purpose,
    strength:
      "다양한 조명·각도·노이즈 환경에 강건하며, 고속 추론을 통해 생산라인 속도 요구사항을 만족합니다.",
    scope: scopeByTask[pair.task],
  }
}

/** Illustrative NxN confusion matrix derived from class labels + accuracy. */
function confusionMatrix(pair: AssetPair) {
  const labels = pair.dataset.distribution.slice(0, 5).map((d) => d.label)
  const acc = pair.model.accuracy / 100
  const rows = labels.map((_, i) => {
    const total = 900 + ((i * 137 + pair.dataset.classCount * 53) % 500)
    const correct = Math.round(total * Math.max(0.86, acc - i * 0.01))
    return labels.map((__, j) => {
      if (i === j) return correct
      return (((i + 1) * (j + 2) * 7) % 13) + 1
    })
  })
  return { labels, rows }
}

function ioSummary(pair: AssetPair) {
  const { model, dataset } = pair
  const input = model.inputs[0]
  const output = model.outputs[0]
  return {
    input: {
      type: "이미지",
      format: dataset.storage.fileType,
      shape: input?.shape ?? "640 × 640 × 3",
      description: input?.description ?? model.input,
    },
    output: {
      type: model.resultType,
      format: output?.shape ?? output?.type ?? "-",
      classes: pair.dataset.classCount,
      description: output?.description ?? model.output,
    },
    labels: pair.dataset.distribution.map((d) => d.label),
  }
}


/* ------------------------------------------------------------------ */

export function PairDetail({ pair }: { pair: AssetPair }) {
  const isValidated = pair.validation === "Validated"
  const modelValidation = useModelValidation(pair.model.id)
  const isModelValidating = modelValidation?.status === "validating"
  const isModelInvalid = modelValidation?.status === "invalid"
  const training = trainingInfo(pair)
  const metrics = performanceMetrics(pair)
  const ctx = applicationContext(pair)
  const matrix = confusionMatrix(pair)
  const io = ioSummary(pair)
  const samples = pair.dataset.sampleImages?.length
    ? pair.dataset.sampleImages
    : [pair.dataset.image]
  const totalNum = Number.parseInt(pair.dataset.totalSamples.replace(/[^0-9]/g, ""), 10) || samples.length

  const [trainPct, valPct, testPct] = pair.dataset.splitRatio
  const splitLabel = `${trainPct} : ${valPct} : ${testPct}`

  const headerStats = [
    { label: pair.metric.label, value: pair.metric.value },
    { label: "다운로드", value: formatCompact(pair.downloads) },
    { label: "즐겨찾기", value: formatCompact(pair.stars) },
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <DetailHeader
        layout="pair"
        title={pair.title}
        image={getTaskThumbnail(pair.task)}
        imageAlt={`${pair.title} 미리보기`}
        version={pair.version}
        breadcrumb={{ label: "AI Asset Pair", href: "/pairs" }}
        tags={pair.tags}
        badges={
          <>
            <TaskBadge task={pair.task} />
            <Badge variant={isModelInvalid ? "destructive" : isValidated ? "default" : "secondary"} className="gap-1">
              {isModelValidating ? <LoaderCircle className="size-3.5 animate-spin" /> : isModelInvalid ? <ShieldAlert className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
              {isModelValidating ? "추론 가능 여부 확인 중" : isModelInvalid ? "추론 준비 실패" : isValidated ? "추론 가능" : "검증 대기"}
            </Badge>
          </>
        }
        pairInfo={{
          dataset: {
            name: pair.dataset.name,
            totalSamples: pair.dataset.totalSamples,
            classCount: pair.dataset.classCount,
            fileType: pair.dataset.storage.fileType,
          },
          model: {
            name: pair.model.name,
            framework: pair.model.framework,
            version: pair.model.version,
            task: pair.model.task,
          },
        }}
        primaryAction={{
          label: "추론하기",
          icon: Rocket,
          href: `/models/${pair.model.id}/deploy`,
          newTab: true,
          disabled: isModelValidating || isModelInvalid,
          disabledReason: isModelValidating ? "추론 가능 여부를 확인하고 있습니다." : isModelInvalid ? modelValidation?.message : undefined,
        }}
      />

      {/*적용환경 및 배경*/}
      <Card className="overflow-hidden">
        {/* Section heading */}
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="text-xl font-semibold tracking-tight">
              적용 환경 및 배경
            </CardTitle>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              AI 모델과 데이터셋의 메타데이터를 기반으로 LLM이 생성한 설명입니다.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Context information */}
          <div className="grid gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
            <ContextBlock
              icon={Building2}
              title="적용 환경"
              body={ctx.environment}
            />

            <ContextBlock
              icon={HelpCircle}
              title="등장 배경"
              body={ctx.background}
            />

            <ContextBlock
              icon={Target}
              title="이 페어의 목적"
              body={ctx.purpose}
            />

            <ContextBlock
              icon={Zap}
              title="핵심 강점"
              body={ctx.strength}
            />
          </div>

          {/* Application scope */}
          <div className="mt-8 border-t border-border pt-6">
            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-3.5" />
                </span>
                주요 활용 범위
              </span>

              <div className="flex flex-wrap gap-2">
                {ctx.scope.map((scope) => (
                  <Badge
                    key={scope}
                    variant="secondary"
                    className="rounded-md px-2.5 py-1 font-normal"
                  >
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Details: Training / Performance / I-O Summary */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">세부 사항</h2>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Model Task"
            value={pair.task}
            accent
          />

          <StatTile
            label="Framework"
            value={pair.model.framework}
          />

          <StatTile
            label="Model Version"
            value={pair.model.version}
          />

          <StatTile
            label={pair.metric.label}
            value={pair.metric.value}
            accent
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="leading-relaxed text-muted-foreground">{pair.description}</p>
              <Separator />
              <div>
                <InfoRow label="데이터셋" value={pair.dataset.name} />
                <InfoRow label="모델" value={pair.model.name} />
                <InfoRow label="생성일" value={pair.dataset.createdAt} />
                <InfoRow label="라이선스" value={pair.license} />
                <InfoRow
                  label="검증 상태"
                  value={
                    <Badge variant={isValidated ? "default" : "secondary"} className="gap-1">
                      <CheckCircle2 className="size-3.5" />
                      {isValidated ? "검증 완료" : "검증 대기"}
                    </Badge>
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="size-4 text-primary" />
                학습 및 성능 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                {metrics.map((m) => (
                  <div key={m.label} className="flex flex-col gap-0.5 rounded-xl border border-border p-3">
                    <span className="text-xs text-muted-foreground text-pretty">{m.label}</span>
                    <span className="text-xl font-semibold tabular-nums text-primary">{m.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
                <span className="text-xs font-medium text-muted-foreground">학습 정보</span>
                <div className="flex flex-col gap-2">
                  {training.slice(0, 4).map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="size-3.5 text-primary" />
                        {label}
                      </span>
                      <span className="text-right font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.65fr]">
          {/* Dataset Summary */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Database className="size-4" />
                </span>
                데이터셋 요약
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col divide-y divide-border">
                <SummaryRow
                  label="데이터 종류"
                  value="이미지"
                />

                <SummaryRow
                  label="전체 샘플"
                  value={`${pair.dataset.totalSamples} 장`}
                />

                <SummaryRow
                  label="라벨 수"
                  value={`${pair.dataset.classCount} 종`}
                />

                <SummaryRow
                  label="파일 형식"
                  value={pair.dataset.storage.fileType}
                />

                <SummaryRow
                  label="생성일"
                  value={pair.dataset.createdAt}
                />
              </div>
            </CardContent>
          </Card>

          {/* Input / Output Summary */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ArrowRightLeft className="size-4" />
                </span>
                입출력 요약
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 xl:grid-cols-2">
                {/* Input */}
                <section className="min-w-0 xl:border-r xl:border-border xl:pr-6">
                  <div className="mb-5 flex flex-col divide-y divide-border">
                    <SummaryRow
                      label="입력 형태"
                      value={io.input.type}
                    />

                    <SummaryRow
                      label="데이터 명"
                      value={pair.dataset.name}
                    />
                  </div>

                  <DimensionTable
                    headers={["항목", "차원", "의미"]}
                    rows={[
                      ["1", "1", "Batch"],
                      ["2", "3", "Channel"],
                      ["3", "1280", "Height"],
                      ["4", "1280", "Width"],
                    ]}
                  />
                </section>

                {/* Output */}
                <section className="min-w-0">
                  <div className="mb-5 flex flex-col divide-y divide-border">
                    <SummaryRow
                      label="출력 형태"
                      value={io.output.type}
                    />

                    <SummaryRow
                      label="출력 항목"
                      value="결함 위치 / 결함 종류 / 신뢰도"
                    />
                  </div>

                  <DimensionTable
                    headers={["항목", "차원", "결과"]}
                    rows={[
                      ["boxes", "[N, 4]", "결함 영역 좌표 (xyxy)"],
                      ["scores", "[N]", "검출 신뢰도"],
                      ["classes", "[N]", "결함 클래스 인덱스"],
                    ]}
                  />
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Dataset preview / Model preview */}
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Dataset Preview — light blue */}
        <Card className="border-chart-3/20 bg-chart-3/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4 text-chart-3" />
              AI Dataset 상세보기
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  <Image src={getTaskThumbnail(pair.dataset.task)} alt={pair.dataset.name} fill className="object-cover" sizes="56px" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold leading-tight text-pretty">{pair.dataset.name}</span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="text-border">|</span>
                    <span>{pair.dataset.totalSamples} 장</span>
                    <span className="text-border">|</span>
                    <span>{pair.dataset.classCount}종 라벨</span>
                    <span className="text-border">|</span>
                    <span>{pair.dataset.version}</span>
                  </div>
                </div>
              </div>
              <ImageGrid images={samples} cols={2} max={4} total={totalNum} />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {pair.dataset.description}
            </p>
            <Link
              href={`/datasets/${pair.dataset.id}`}
              className={cn(buttonVariants({ variant: "outline" }), "w-full bg-card")}
            >
              <Database data-icon="inline-start" />
              Dataset 상세 페이지로 이동
              <ArrowRight data-icon="inline-end" />
            </Link>
          </CardContent>
        </Card>

        {/* Model Preview — indigo */}
        <Card className="border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="size-4 text-primary" />
              AI Model 상세보기
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  <Image src={getTaskThumbnail(pair.model.task)} alt={pair.model.name} fill className="object-cover" sizes="56px" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold leading-tight text-pretty">{pair.model.name}</span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{pair.model.framework}</span>
                    <span className="text-border">|</span>
                    <span>{pair.model.task}</span>
                    <span className="text-border">|</span>
                    <span>{pair.model.version}</span>
                  </div>
                </div>
              </div>
              <ImageGrid
                images={[pair.model.resultImage, ...samples].filter(Boolean)}
                cols={3}
                max={6}
                total={totalNum}
              />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {pair.model.description}
            </p>
            <Link
              href={`/models/${pair.model.id}`}
              className={cn(buttonVariants(), "w-full")}
            >
              <Cpu data-icon="inline-start" />
              Model 상세 페이지로 이동
              <ArrowRight data-icon="inline-end" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ContextBlock({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof HelpCircle
  title: string
  body: string
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>

        <h3 className="text-sm font-semibold text-foreground">
          {title}
        </h3>
      </div>

      <p className="text-pretty text-sm leading-6 text-muted-foreground">
        {body}
      </p>
    </div>
  )
}

function IoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-pretty">{value}</span>
    </div>
  )
}

function ImageGrid({
  images,
  cols,
  max,
  total,
}: {
  images: string[]
  cols: number
  max: number
  total: number
}) {
  const shown = images.slice(0, max)
  const hasMore = total > shown.length
  const extra = Math.max(0, total - shown.length)
  return (
    <div
      className={cn("grid w-40 shrink-0 gap-1", cols === 3 ? "grid-cols-3" : "grid-cols-2")}
    >
      {shown.map((src, i) => {
        const isLast = i === shown.length - 1 && hasMore
        return (
          <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
            <Image src={src || "/placeholder.svg"} alt={`샘플 ${i + 1}`} fill className="object-cover" sizes="60px" />
            {isLast && (
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-xs font-semibold text-background">
                +{extra.toLocaleString()}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Labeled confusion matrix table using class labels. */
function ConfusionMatrix({
  matrix,
}: {
  matrix: { labels: string[]; rows: number[][] }
}) {
  const { labels, rows } = matrix
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
      <span className="text-xs font-medium text-muted-foreground">Confusion Matrix (Test Set)</span>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="p-1 text-left font-medium text-muted-foreground" />
              {labels.map((l) => (
                <th key={l} className="p-1 text-center font-medium text-muted-foreground">
                  <span className="line-clamp-1">{l}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={labels[i]}>
                <th className="whitespace-nowrap p-1 text-left font-medium text-muted-foreground">
                  {labels[i]}
                </th>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className={cn(
                      "p-1 text-center tabular-nums",
                      i === j ? "rounded bg-primary/15 font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {v.toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
      <span className="shrink-0 text-sm text-muted-foreground">
        {label}
      </span>

      <span className="min-w-0 text-right text-sm font-medium text-foreground text-pretty">
        {value}
      </span>
    </div>
  )
}

function DimensionTable({
  headers,
  rows,
}: {
  headers: [string, string, string]
  rows: [string, string, string][]
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-[0.7fr_0.8fr_1.5fr] bg-muted/40 text-xs font-medium text-muted-foreground">
        {headers.map((header) => (
          <span key={header} className="px-3 py-2.5">
            {header}
          </span>
        ))}
      </div>

      <div className="divide-y divide-border">
        {rows.map(([item, dimension, description]) => (
          <div
            key={`${item}-${dimension}`}
            className="grid grid-cols-[0.7fr_0.8fr_1.5fr] items-center text-sm"
          >
            <span className="px-3 py-3 font-mono text-xs">
              {item}
            </span>

            <span className="px-3 py-3 font-mono text-xs">
              {dimension}
            </span>

            <span className="px-3 py-3 text-muted-foreground">
              {description}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

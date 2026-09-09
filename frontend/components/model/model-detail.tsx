"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  Building2,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  FileCode2,
  GitBranch,
  History,
  Mail,
  LoaderCircle,
  Rocket,
  Server,
  ShieldCheck,
  ShieldAlert,
  SplitSquareHorizontal,
  Target,
  TrendingUp,
  User,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AasActions } from "@/components/registry/aas-actions"
import { DetailHeader } from "@/components/registry/detail-header"
import { TaskBadge } from "@/components/registry/task-badge"
import { useModelValidation } from "@/hooks/use-model-validation"
import { buildModelAasEnv } from "@/lib/aas/mock-aas"
import { getDataset, getTaskThumbnail, type Model, type TreeNode } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

function inputDataType(task: Model["task"]): string {
  switch (task) {
    case "OCR":
      return "문서 이미지 (Document Image)"
    case "Anomaly Detection":
      return "시계열 신호 (Time-series)"
    case "Segmentation":
      return "이미지 (Image)"
    case "Classification":
      return "이미지 (Image)"
    default:
      return "이미지 (Image)"
  }
}

function primaryMetricLabel(task: Model["task"]): string {
  switch (task) {
    case "Anomaly Detection":
      return "ROC-AUC"
    case "Segmentation":
      return "mIoU"
    case "OCR":
      return "CER"
    case "Classification":
      return "Top-1"
    default:
      return "mAP@50"
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return String(n)
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 whitespace-nowrap text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate whitespace-nowrap text-right font-medium">
        {value}
      </span>
    </div>
  )
}

/** Section heading used inside the large containers. */
function SectionTitle({ icon: Icon, children }: { icon: typeof Cpu; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      <Icon className="size-4 text-primary" />
      {children}
    </h2>
  )
}

function parseShape(shape: string): string[] {
  return shape
    .replace(/[[\]]/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function DimensionTable({ rows }: { rows: { dim: number; size: string; info: string }[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">항목</th>
            <th className="px-3 py-2 font-medium">차원</th>
            <th className="px-3 py-2 font-medium">의미</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.dim} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.dim}</td>
              <td className="px-3 py-2 font-mono text-xs font-medium">{r.size}</td>
              <td className="px-3 py-2 text-pretty">{r.info}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function flattenTree(node: TreeNode): TreeNode[] {
  const out: TreeNode[] = [node]
  node.children?.forEach((child) => out.push(...flattenTree(child)))
  return out
}

/** A single node in the model tree, drawn with a connector rail to its children. */
function LineageNode({ node, depth }: { node: TreeNode; depth: number }) {
  const children = node.children ?? []
  const isRoot = depth === 0

  return (
    <div className="flex flex-col">
      <div className="relative flex gap-3">
        {/* Marker + vertical connector to the next node. */}
        <div className="relative flex flex-col items-center pt-1">
          <span
            className={cn(
              "flex size-3 shrink-0 items-center justify-center rounded-full",
              isRoot ? "bg-primary" : "bg-primary/40",
            )}
          />
          {children.length > 0 && (
            <span aria-hidden className="mt-1 w-px flex-1 bg-border" />
          )}
        </div>

        {/* Node card */}
        <div className="mb-3 flex flex-1 flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <span className="truncate whitespace-nowrap font-semibold leading-tight" title={node.name}>
            {node.name}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>파일 용량 {node.size}</span>
            <span>{node.createdAt}</span>
          </div>
        </div>
      </div>

      {/* Children rendered recursively to form the tree. */}
      {children.map((child) => (
        <LineageNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

function Lineage({ root }: { root: TreeNode }) {
  return (
    <div className="flex flex-col">
      <LineageNode node={root} depth={0} />
    </div>
  )
}

export function ModelDetail({ model }: { model: Model }) {
  const modelValidation = useModelValidation(model.id)
  const isModelValidating = modelValidation?.status === "validating"
  const isModelInvalid = modelValidation?.status === "invalid"
  const dataset = getDataset(model.datasetId)
  const inputExample = dataset?.sampleImages?.[0] ?? dataset?.image ?? model.image
  const inputShape = model.inputs[0]?.shape ?? "—"
  const inputFormat = model.inputs[0]?.type ?? "—"
  const outputShape = model.outputs[0]?.shape ?? "—"
  const outputFormats = Array.from(new Set(model.outputs.map((o) => o.type))).join(", ")
  const returnValues = model.outputs.map((o) => o.name).join(" / ")
  const hardware = model.supportedEnv.filter((env) => !/runtime/i.test(env)).join(", ")

  // Only show the sample thumbnail when the data type is actually an image.
  const isImageDataType = (value?: string) => !!value && /이미지|image|mask/i.test(value)
  const inputIsImage = isImageDataType(dataset?.dataType)
  const hasOutputImage = !!model.resultImage

  const lineage = model.tree ? flattenTree(model.tree) : []
  const lastUpdated = lineage[lineage.length - 1]?.createdAt ?? model.versions?.[0]?.date ?? "—"

  // Dimension tables derived from the model's declared shapes.
  const inputDimMeanings = ["Batch", "Channel", "Height", "Width"]
  const inputDimRows = parseShape(inputShape).map((size, i) => ({
    dim: i + 1,
    size,
    info: inputDimMeanings[i] ?? "—",
  }))
  const outputDimMeanings = ["검출된 객체 수 (가변)", "[x1, y1, x2, y2]"]
  const outputDimRows = parseShape(outputShape).map((size, i) => ({
    dim: i + 1,
    size,
    info: outputDimMeanings[i] ?? "—",
  }))

  const summaryItems = [
    { icon: Target, label: "적용 분야", value: "자동차 외관 검사" },
    { icon: Boxes, label: "주요 기능", value: "결함 검출 및 위치 표시" },
    { icon: TrendingUp, label: "기대 효과", value: "검사 자동화, 인력 절감, 품질 일관성 향상" },
  ]

  const perfMetrics = [
    { label: "Accuracy", value: model.accuracy },
    { label: "Precision", value: model.precision },
    { label: "Recall", value: model.recall },
    { label: "F1 Score", value: model.f1 },
  ]

  // Task-appropriate headline metric shown in the header.
  const seed = hashString(model.id)
  const downloads = 1500 + (seed % 8000)
  const favorites = 60 + (seed % 400)

  const headerStats = [
    { label: "다운로드", value: formatCompact(downloads) },
    { label: "즐겨찾기", value: String(favorites) },
  ]

  const triggerClass = "data-active:text-foreground after:bg-primary"

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <DetailHeader
        image={getTaskThumbnail(model.task)}
        imageAlt={`${model.name} 미리보기`}
        title={model.name}
        version={model.version}
        versions={model.versions}
        breadcrumb={{ label: "AI Model", href: "/models" }}
        tags={model.tags}
        badges={
          <>
            <TaskBadge task={model.task} />
            <Badge className={cn("gap-1 border-primary/20 bg-primary/10 text-primary", isModelInvalid && "border-destructive/20 bg-destructive/10 text-destructive")}>
              {isModelValidating ? <LoaderCircle className="size-3 animate-spin" /> : isModelInvalid ? <ShieldAlert className="size-3" /> : <ShieldCheck className="size-3" />}
              {isModelValidating ? "추론 가능 여부 확인 중" : isModelInvalid ? "추론 준비 실패" : "추론 가능"}
            </Badge>
          </>
        }
        stats={headerStats}
        primaryAction={{
          label: "추론하기",
          icon: Rocket,
          href: `/models/${model.id}/deploy`,
          newTab: true,
          disabled: isModelValidating || isModelInvalid,
          disabledReason: isModelValidating ? "추론 가능 여부를 확인하고 있습니다." : isModelInvalid ? modelValidation?.message : undefined,
        }}
        actions={
          <AasActions
            entityId={model.id}
            entityKind="model"
            title={model.name}
            versionMeta={model.versions}
            env={buildModelAasEnv(model)}
          />
        }
      />

      <Tabs defaultValue="overview" className="gap-6">
        <div className="-mx-4 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
          <TabsList variant="line" className="w-max">
            <TabsTrigger value="overview" className={triggerClass}>
              개요
            </TabsTrigger>

            <TabsTrigger value="details" className={triggerClass}>
              모델 세부 사항
            </TabsTrigger>

            <TabsTrigger value="history" className={triggerClass}>
              버전 히스토리
            </TabsTrigger>
          </TabsList>
        </div>
        {/* ---------------------------- TAB 1: 개요 ---------------------------- */}
        <TabsContent value="overview">
          <div className="flex flex-col gap-6">
              {/* Row 1: 모델 설명 | 학습 성능 */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
                {/* 모델 설명 */}
                <div className="flex min-h-[280px] flex-col rounded-3xl border border-border bg-card p-6 md:p-8">
                  <SectionTitle icon={Target}>모델 설명</SectionTitle>

                  <p className="mt-5 text-base leading-7 text-muted-foreground text-pretty">
                    자동차 생산 라인에서 촬영한 차량 이미지를 분석해 스크래치, 덴트,
                    도장 불량 등 외관 결함을 자동으로 검출하는 모델입니다. 육안 검사에
                    의존하던 외관 품질 확인을 자동화해 검사 속도와 일관성을 높입니다.
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                    {summaryItems.map((item) => (
                      <div
                        key={item.label}
                        className="flex min-w-0 flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <item.icon className="size-3.5" />
                          </span>

                          <span className="text-sm font-medium text-foreground">
                            {item.label}
                          </span>
                        </div>

                        <p className="pl-8 text-sm leading-5 text-muted-foreground text-pretty">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 학습 성능 */}
                <div className="flex min-h-[280px] flex-col rounded-3xl border border-border bg-card p-6 md:p-8">
                  <SectionTitle icon={TrendingUp}>학습 성능</SectionTitle>

                  <div className="mt-5 grid flex-1 grid-cols-2 grid-rows-2">
                    {perfMetrics.map((m, index) => (
                      <div
                        key={m.label}
                        className={cn(
                          "flex flex-col justify-center px-6 py-4",
                          index % 2 === 1 && "border-l border-border",
                          index >= 2 && "border-t border-border",
                        )}
                      >
                        <span className="text-xs font-medium text-muted-foreground">
                          {m.label}
                        </span>

                        <span className="mt-2 text-2xl font-semibold tabular-nums text-primary">
                          {m.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Row 2: 학습 데이터셋 | 지원 환경 */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
                {/* 학습 데이터셋 */}
                <div className="flex min-h-[280px] flex-col rounded-3xl border border-border bg-card p-6 md:p-8">
                  <SectionTitle icon={Database}>학습 데이터셋</SectionTitle>
                  {dataset ? (
                    <>
                      <div className="mt-5 flex items-center gap-4">
                        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                          <Image
                            src={getTaskThumbnail(dataset.task)}
                            alt={`${dataset.name} 썸네일`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </span>

                        <div className="flex min-w-0 flex-col gap-2">
                          <span className="font-semibold leading-tight text-pretty">
                            {dataset.name}
                          </span>

                          <div className="flex flex-wrap items-center gap-2">
                            <TaskBadge task={dataset.task} />
                            <span className="font-mono text-xs text-muted-foreground">
                              {dataset.storage.fileType}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-3 divide-x divide-border">
                        <div className="flex flex-col gap-1 pr-4">
                          <span className="text-xs text-muted-foreground">샘플 수</span>
                          <span className="text-sm font-semibold tabular-nums">
                            {dataset.totalSamples}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 px-4">
                          <span className="text-xs text-muted-foreground">라벨 수</span>
                          <span className="text-sm font-semibold tabular-nums">
                            {dataset.classCount}종
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 pl-4">
                          <span className="text-xs text-muted-foreground">데이터 분할</span>
                          <span className="text-sm font-semibold tabular-nums">
                            {dataset.splitRatio.join(" / ")}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Train / Val / Test
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/datasets/${dataset.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "mt-auto w-full",
                        )}
                      >
                        <Database data-icon="inline-start" />
                        AI 데이터셋 보기
                        <ExternalLink data-icon="inline-end" />
                      </Link>
                    </>
                  ) : (
                    <p className="mt-5 text-sm text-muted-foreground">
                      연결된 학습 데이터셋이 없습니다.
                    </p>
                  )}
                </div>

                {/* 지원 환경 */}
                <div className="flex min-h-[280px] flex-col rounded-3xl border border-border bg-card p-6 md:p-8">
                  <SectionTitle icon={Server}>지원 환경</SectionTitle>

                  <div className="mt-5 flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Code2 className="size-4" />
                      </span>

                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">Python</span>
                        <span className="text-xs text-muted-foreground">
                          프로그래밍 언어
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Boxes className="size-4" />
                      </span>

                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{model.framework}</span>
                        <span className="text-xs text-muted-foreground">프레임워크</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Cpu className="size-4" />
                      </span>

                      <div className="flex flex-col gap-1">
                        <span
                          className="max-w-64 truncate whitespace-nowrap text-xs font-medium"
                          title={hardware}
                        >
                          {hardware}
                        </span>
                        <span className="text-xs text-muted-foreground">하드웨어</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: 입력 (Input) | 출력 (Output) */}
              <div className="hidden">
                {/* Input */}
                <div className="flex min-h-[300px] flex-col rounded-3xl border border-border bg-card p-6 md:p-8">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ArrowDownToLine className="size-4" />
                    </span>
                    <span className="text-base font-semibold">입력 (Input)</span>
                  </div>

                  <div className={`mt-5 grid gap-5 ${inputIsImage ? "sm:grid-cols-[180px_1fr]" : ""}`}>
                    {inputIsImage && (
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
                        <Image
                          src={inputExample || "/placeholder.svg"}
                          alt={`${model.name} 입력 데이터 예시`}
                          fill
                          className="object-cover"
                          sizes="180px"
                        />
                      </div>
                    )}

                    <div className="flex flex-col divide-y divide-border/60">
                      <SpecRow label="데이터 명" value={dataset?.name ?? "—"} />
                      <SpecRow label="데이터 종류" value={dataset?.dataType ?? "—"} />
                      <SpecRow label="차원" value={<span className="font-mono text-xs">{inputShape}</span>} />
                    </div>
                  </div>
                </div>

                {/* Flow arrow */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm lg:flex"
                >
                  <ArrowRight className="size-4" />
                </span>

                {/* Output */}
                <div className="flex min-h-[300px] flex-col rounded-3xl border border-border bg-card p-6 md:p-8">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                      <ArrowUpFromLine className="size-4" />
                    </span>
                    <span className="text-base font-semibold">출력 (Output)</span>
                  </div>

                  <div className={`mt-5 grid gap-5 ${hasOutputImage ? "sm:grid-cols-[180px_1fr]" : ""}`}>
                    {hasOutputImage && (
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
                        <Image
                          src={model.resultImage || "/placeholder.svg"}
                          alt={`${model.name} 출력 결과 예시`}
                          fill
                          className="object-cover"
                          sizes="180px"
                        />
                      </div>
                    )}

                    <div className="flex flex-col divide-y divide-border/60">
                      <SpecRow
                        label="출력 형태"
                        value={model.outputFormat}
                      />
                      <SpecRow
                        label="출력 항목"
                        value={model.outputItems.join(" / ")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </TabsContent>

        {/* ----------------------- TAB 2: 모델 세부 사항 ----------------------- */}
        <TabsContent value="details">
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col p-0">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 border-b border-border md:grid-cols-4">
                {[
                  { icon: Target, label: "모델 유형", value: model.task },
                  { icon: Boxes, label: "프레임워크", value: model.framework },
                  { icon: Code2, label: "언어", value: model.programLanguage },
                  { icon: History, label: "버전", value: model.version },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 border-b border-r border-border p-4 last:border-r-0 md:border-b-0"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="truncate text-sm font-semibold">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Row 1: 입력 정보 | 출력 정보 */}
              <div className="overflow-hidden rounded-3xl border border-border bg-card">
                <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_1px_1fr]">
                  <div className="min-h-[300px] p-6 md:p-8">
                    <SectionTitle icon={ArrowDownToLine}>입력 정보</SectionTitle>

                    <div className="mt-5 flex flex-col divide-y divide-border/60">
                      <SpecRow label="입력 형태" value={dataset?.dataType ?? model.dataType} />
                      <SpecRow label="데이터 명" value={dataset?.name ?? "—"} />
                    </div>

                    <div className="mt-6">
                      <DimensionTable rows={inputDimRows} />
                    </div>
                  </div>

                  <div className="hidden bg-border lg:block" />

                  <div className="min-h-[300px] p-6 md:p-8">
                    <SectionTitle icon={ArrowUpFromLine}>출력 정보</SectionTitle>

                    <div className="mt-5 flex flex-col divide-y divide-border/60">
                      <SpecRow label="출력 형태" value={model.outputFormat} />
                      <SpecRow label="출력 항목" value={model.outputItems.join(" / ")} />
                    </div>

                    <div className="mt-6 overflow-hidden rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                            <th className="px-3 py-2 font-medium">항목</th>
                            <th className="px-3 py-2 font-medium">차원</th>
                            <th className="px-3 py-2 font-medium">결과</th>
                          </tr>
                        </thead>
                        <tbody>
                          {model.outputs.map((output) => (
                            <tr key={output.name} className="border-b border-border/60 last:border-0">
                              <td className="px-3 py-2 font-mono text-xs font-medium">{output.name}</td>
                              <td className="px-3 py-2 font-mono text-xs">{output.shape}</td>
                              <td className="px-3 py-2 text-muted-foreground">{output.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Row 2: 학습 결과 상세 */}
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="flex flex-col gap-5 p-6 md:p-8">
                  <SectionTitle icon={TrendingUp}>학습 결과 상세</SectionTitle>

                  <div className="grid grid-cols-1 gap-3">
                    {[
                      {
                        label: "Accuracy",
                        value: model.accuracy,
                        description: "전체 예측 중 실제 정답과 일치한 비율입니다.",
                      },
                      {
                        label: "Precision",
                        value: model.precision,
                        description: "모델이 결함이라고 판단한 결과 중 실제 결함인 비율입니다.",
                      },
                      {
                        label: "Recall",
                        value: model.recall,
                        description: "실제 결함 중 모델이 놓치지 않고 찾아낸 비율입니다.",
                      },
                      {
                        label: "F1 Score",
                        value: model.f1,
                        description: "Precision과 Recall의 균형을 함께 보여주는 종합 지표입니다.",
                      },
                    ].map((metric) => (
                      <div
                        key={metric.label}
                        className="flex items-center justify-between gap-6 rounded-xl border border-border p-4"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold">{metric.label}</span>
                          <span className="text-xs leading-relaxed text-muted-foreground">
                            {metric.description}
                          </span>
                        </div>

                        <div className="shrink-0 text-2xl font-semibold tabular-nums text-primary">
                          {metric.value}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-5 border-t border-border p-6 md:p-8 lg:border-l lg:border-t-0">
                  <SectionTitle icon={FileCode2}>학습 결과 그래프</SectionTitle>

                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                    <Image
                      src={model.resultImage || "/placeholder.svg"}
                      alt={`${model.name} 학습 결과 이미지`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 420px, 100vw"
                    />
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    모델의 대표 결과 예시입니다. 실제 학습 그래프나 Confusion Matrix 이미지가 연결되면
                    이 영역에 대체 표시할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------- TAB 3: 버전 히스토리 ----------------------- */}
        <TabsContent value="history">
          <Card className="overflow-hidden">
            <CardContent className="grid grid-cols-1 p-0 lg:grid-cols-[1fr_1px_1fr]">
              {/* 모델 트리 */}
              <div className="flex min-h-[420px] flex-col gap-5 p-6 md:p-8">
                <SectionTitle icon={GitBranch}>모델 트리</SectionTitle>
                {model.tree ? (
                  <Lineage root={model.tree} />
                ) : (
                  <p className="text-sm text-muted-foreground">모델 트리 정보가 없습니다.</p>
                )}
              </div>

              <div className="hidden lg:block bg-border" />

              {/* 버전 관리 정보 */}
              <div className="flex min-h-[420px] flex-col gap-5 p-6 md:p-8">
                <SectionTitle icon={History}>버전 관리</SectionTitle>

                <div className="flex flex-col divide-y divide-border/60">
                  <SpecRow label="현재 버전" value={<span className="font-mono text-xs">{model.version}</span>} />
                  <SpecRow label="최종 업데이트" value={<span className="tabular-nums">{lastUpdated}</span>} />
                </div>

                <Separator />

                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold">변경 이력</h3>

                  <div className="flex flex-col gap-3">
                    {model.versions.map((version) => (
                      <div
                        key={version.version}
                        className="rounded-xl border border-border p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-semibold">{version.version}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {version.date}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {version.changes}
                        </p>

                        <p className="mt-2 text-xs text-muted-foreground">
                          작성자: {version.author}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

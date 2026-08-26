"use client"

import { motion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  Cpu,
  Database,
  Download,
  Link2,
  LoaderCircle,
  Lock,
  Rocket,
  Star,
} from "lucide-react"

import { TaskBadge } from "@/components/registry/task-badge"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useModelValidation } from "@/hooks/use-model-validation"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getTaskThumbnail, type AssetPair } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return `${n}`
}

const accessLabel = {
  Public: "공개",
  Restricted: "제한",
  Private: "비공개",
} as const

/** Small status icon with an accessible tooltip. */
function StatusIcon({
  icon: Icon,
  label,
  tone = "muted",
}: {
  icon: typeof CircleCheck
  label: string
  tone?: "primary" | "success" | "warning" | "muted"
}) {
  const toneClass = {
    primary: "text-primary",
    success: "text-primary",
    warning: "text-amber-600 dark:text-amber-500",
    muted: "text-muted-foreground",
  }[tone]

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "flex size-7 items-center justify-center rounded-full border border-border bg-card",
          toneClass,
        )}
      >
        <Icon className="size-3.5" />
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Compact asset node (Dataset or Model). */
function AssetNode({
  kind,
  name,
  subtitle,
  image,
  featured = false,
}: {
  kind: "dataset" | "model"
  name: string
  subtitle: string
  image?: string
  featured?: boolean
}) {
  const isDataset = kind === "dataset"
  const Icon = isDataset ? Database : Cpu
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-xl border p-4",
        featured && !isDataset
          ? "border-primary/25 bg-gradient-to-br from-primary/12 via-primary/6 to-background shadow-sm ring-1 ring-primary/10"
          : isDataset
            ? "border-border/80 bg-muted/20"
            : "border-border bg-muted/30",
      )}
    >
      {featured && !isDataset && image ? (
        <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-primary/10 shadow-sm">
          <Image src={image} alt="" fill className="object-cover" sizes="80px" />
          <span className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
        </span>
      ) : (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg",
            featured && !isDataset ? "size-12" : "size-10",
            isDataset ? "bg-chart-3/10 text-chart-3" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className={featured && !isDataset ? "size-6" : "size-5"} />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            isDataset ? "text-chart-3" : "text-primary",
          )}
        >
          {isDataset ? "AI 데이터셋" : "AI 모델"}
        </span>
        <span className={cn("truncate font-semibold leading-tight", featured && !isDataset ? "text-base" : "text-sm")}>{name}</span>
        <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  )
}

export function PairCard({
  pair,
  index = 0,
  variant = "default",
}: {
  pair: AssetPair
  index?: number
  variant?: "default" | "featured"
}) {
  const isValidated = pair.validation === "Validated"
  const isFeatured = variant === "featured"
  const modelValidation = useModelValidation(pair.model.id)
  const isValidating = modelValidation?.status === "validating"
  const isInvalid = modelValidation?.status === "invalid"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4), ease: "easeOut" }}
    >
      <Card
        className={cn(
          "flex flex-col gap-5 border-primary/15 bg-gradient-to-r from-card via-card to-primary/[0.035] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:ring-primary/30 hover:shadow-lg hover:shadow-foreground/5 md:p-6",
          isFeatured && "ring-1 ring-primary/10",
          isValidating && "animate-pulse opacity-60 ring-2 ring-primary/30",
          isInvalid && "ring-2 ring-destructive/30",
        )}
      >
        {/* Top row: title + minimal badges + status icons */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <TaskBadge task={pair.task} />
            <Badge variant="outline">{pair.framework}</Badge>
            <Badge variant="outline">{accessLabel[pair.access]}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {isValidating ? (
              <Badge className="gap-1.5"><LoaderCircle className="size-3.5 animate-spin" />추론 가능 여부 확인 중</Badge>
            ) : isInvalid ? (
              <Badge variant="destructive" className="gap-1.5"><AlertTriangle className="size-3.5" />추론 준비 실패</Badge>
            ) : isValidated ? (
              <Badge className="gap-1.5 border-primary/20 bg-primary/10 text-primary"><CircleCheck className="size-3.5" />추론 가능</Badge>
            ) : (
              <StatusIcon icon={AlertTriangle} label="검증 경고" tone="warning" />
            )}
            <StatusIcon icon={Link2} label="페어 연결됨" tone="primary" />
            {pair.access !== "Public" && (
              <StatusIcon icon={Lock} label={`접근 권한: ${accessLabel[pair.access]}`} />
            )}
          </div>
        </div>

        {/* Relationship flow + metrics */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          {/* Dataset → Linked → Model */}
          <div className="flex min-w-0 flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <AssetNode
              kind="dataset"
              name={pair.dataset.name}
              subtitle={`${pair.dataset.labelType} · ${pair.task}`}
              featured={isFeatured}
            />

            {/* Center link indicator */}
            <div className="flex w-full shrink-0 items-center sm:w-40" aria-label="데이터셋이 모델 학습에 사용됨">
              <span className="h-px min-w-3 flex-1 bg-primary/30" />
              <span className="mx-2 inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary whitespace-nowrap">
                <Link2 className="size-3.5" />
                학습에 사용됨
              </span>
              <span className="relative h-px min-w-3 flex-1 bg-primary/30">
                <span className="absolute -right-px -top-[3px] size-1.5 rotate-45 border-r border-t border-primary/50" />
              </span>
            </div>

            <AssetNode
              kind="model"
              name={pair.model.name}
              subtitle={`${pair.framework} · ${pair.version}`}
              image={getTaskThumbnail(pair.model.task)}
              featured
            />
          </div>

          {/* Metrics panel */}
          <div className="flex shrink-0 items-center gap-5 border-t border-border pt-4 lg:w-56 lg:flex-col lg:items-stretch lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div className="flex flex-1 items-center justify-around gap-4 lg:flex-col lg:items-stretch lg:justify-start lg:gap-3">
              <div className="flex flex-col leading-tight">
                <span className="text-xs text-muted-foreground">{pair.metric.label}</span>
                <span className="text-xl font-semibold tabular-nums text-primary">
                  {pair.metric.value}
                </span>
              </div>
              <div className="flex items-center gap-4 lg:gap-5">
                <span className="flex flex-col leading-tight lg:flex-row lg:items-center lg:gap-1.5">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                    <Download className="size-3.5" />
                    다운로드
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCompact(pair.downloads)}
                  </span>
                </span>
                <span className="flex flex-col leading-tight lg:flex-row lg:items-center lg:gap-1.5">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                    <Star className="size-3.5" />
                    즐겨찾기
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCompact(pair.stars)}
                  </span>
                </span>
              </div>
            </div>
            <Link
              href={`/pairs/${pair.id}`}
              className={cn(buttonVariants({ size: "sm" }), "shrink-0 lg:w-full")}
            >
              모델 및 페어 보기
              <ArrowRight data-icon="inline-end" />
            </Link>
            {!isValidating && !isInvalid && (
              <Link
                href={`/models/${pair.model.id}/deploy`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "shrink-0 border-primary/30 text-primary lg:w-full")}
              >
                <Rocket data-icon="inline-start" />
                추론하기
              </Link>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

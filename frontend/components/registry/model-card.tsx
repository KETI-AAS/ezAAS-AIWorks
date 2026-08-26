"use client"

import { motion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, CircleCheck, Database, LoaderCircle, ShieldAlert, Target } from "lucide-react"

import { TaskBadge } from "@/components/registry/task-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useModelValidation } from "@/hooks/use-model-validation"
import { getDataset, getTaskThumbnail, type Model } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

export function ModelCard({ model, index = 0 }: { model: Model; index?: number }) {
  const dataset = getDataset(model.datasetId)
  const validation = useModelValidation(model.id)
  const isValidating = validation?.status === "validating"
  const isInvalid = validation?.status === "invalid"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4), ease: "easeOut" }}
    >
      <Link href={`/models/${model.id}`} className="group block h-full">
        <Card className={cn(
          "relative h-full gap-0 overflow-hidden border-primary/15 bg-gradient-to-b from-card via-card to-primary/[0.035] p-0 ring-1 ring-primary/5 transition-all duration-300 hover:-translate-y-1 hover:ring-primary/30 hover:shadow-lg hover:shadow-foreground/5",
          isValidating && "animate-pulse pointer-events-none opacity-60 ring-2 ring-primary/30",
          isInvalid && "ring-2 ring-destructive/30",
        )}>
          <div className="relative aspect-[16/10] overflow-hidden bg-muted">
            <Image
              src={getTaskThumbnail(model.task)}
              alt={`${model.name} 대표 이미지`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute left-3 top-3">
              <TaskBadge task={model.task} className="bg-background/90 text-foreground backdrop-blur-sm" />
            </div>
            <Badge className={cn(
              "absolute bottom-3 left-3 gap-1.5 border-primary/20 bg-background/90 text-primary shadow-sm backdrop-blur-sm",
              isInvalid && "border-destructive/20 bg-destructive text-white",
            )}>
              {isValidating ? <LoaderCircle className="size-3.5 animate-spin" /> : isInvalid ? <ShieldAlert className="size-3.5" /> : <CircleCheck className="size-3.5" />}
              {isValidating ? "추론 가능 여부 확인 중" : isInvalid ? "추론 준비 실패" : "추론 가능"}
            </Badge>
            <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <CardContent className="flex flex-1 flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="min-w-0 truncate whitespace-nowrap font-heading text-base font-semibold leading-snug"
                title={model.name}
              >
                {model.name}
              </h3>
              <Badge variant="outline" className="shrink-0 font-mono">
                {model.version}
              </Badge>
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {model.description}
            </p>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-muted-foreground">
                <Target className="size-4 text-primary" />
                <span className="font-medium text-foreground">{model.accuracy}%</span>
                정확도
              </span>
              <span className="inline-flex items-center gap-1.5 truncate text-muted-foreground">
                <Database className="size-4" />
                <span className="truncate">학습 데이터 · {dataset?.name ?? "—"}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

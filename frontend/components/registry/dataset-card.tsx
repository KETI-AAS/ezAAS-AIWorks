"use client"

import { motion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Boxes, Images } from "lucide-react"

import { TaskBadge } from "@/components/registry/task-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getModelsByDataset, getTaskThumbnail, type Dataset } from "@/lib/registry-data"

export function DatasetCard({ dataset, index = 0 }: { dataset: Dataset; index?: number }) {
  const usedBy = getModelsByDataset(dataset.id).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4), ease: "easeOut" }}
    >
      <Link href={`/datasets/${dataset.id}`} className="group block h-full">
        <Card className="h-full gap-0 p-0 transition-all duration-300 hover:-translate-y-1 hover:ring-primary/30 hover:shadow-lg hover:shadow-foreground/5">
          <div className="relative aspect-[16/10] overflow-hidden bg-muted">
            <Image
              src={getTaskThumbnail(dataset.task)}
              alt={`${dataset.name} 미리보기`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute left-3 top-3">
              <TaskBadge task={dataset.task} className="bg-background/90 text-foreground backdrop-blur-sm" />
            </div>
            <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <CardContent className="flex flex-1 flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="min-w-0 truncate whitespace-nowrap font-heading text-base font-semibold leading-snug"
                title={dataset.name}
              >
                {dataset.name}
              </h3>
              <Badge variant="outline" className="shrink-0 font-mono">
                {dataset.version}
              </Badge>
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {dataset.description}
            </p>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <Images className="size-4 text-primary" />
                {dataset.totalSamples} 샘플
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                <Boxes className="size-4" />
                {usedBy}개 모델 연계
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

"use client"

import { Cpu, Database, Download, Link2, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { PreviousVersionNotice, VersionSelect } from "@/components/registry/version-select"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import type { VersionEntry } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

type DetailHeaderProps = {
  layout?: "default" | "pair"
  image: string
  imageAlt: string
  title: string
  version: string
  /** Full version history. When it has more than one entry, a version selector is shown. */
  versions?: VersionEntry[]
  breadcrumb: {
    label: string
    href: string
  }
  tags: string[]
  badges: React.ReactNode
  stats?: {
    label: string
    value: string
    accent?: boolean
  }[]
  primaryAction?: {
    label: string
    icon: typeof Download
    href?: string
    newTab?: boolean
    disabled?: boolean
    disabledReason?: string
  }
  /** Extra action buttons rendered alongside the favorite / primary action. */
  actions?: React.ReactNode
  pairInfo?: {
    dataset: {
      name: string
      totalSamples: string
      classCount: number
      fileType: string
    }
    model: {
      name: string
      framework: string
      version: string
      task: string
    }
  }
}

export function DetailHeader({
  layout = "default",
  image,
  imageAlt,
  title,
  version,
  versions,
  breadcrumb,
  tags,
  badges,
  stats,
  primaryAction,
  actions,
  pairInfo,
}: DetailHeaderProps) {
  const isPairLayout = layout === "pair"
  const [favorite, setFavorite] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(version)
  const PrimaryIcon = primaryAction?.icon

  const hasHistory = !!versions && versions.length > 1
  const latestVersion = versions?.[0]?.version ?? version
  const selectedEntry = versions?.find(
    (item) => item.version === selectedVersion,
  )
  const viewingPrevious =
    hasHistory && selectedVersion !== latestVersion

  if (isPairLayout && pairInfo) {
    return (
      <PairDetailHeader
        image={image}
        imageAlt={imageAlt}
        breadcrumb={breadcrumb}
        tags={tags}
        badges={badges}
        pairInfo={pairInfo}
        primaryAction={primaryAction}
        favorite={favorite}
        onFavoriteChange={() => {
          setFavorite((current) => !current)

          toast.success(
            favorite
              ? "즐겨찾기에서 제거했습니다"
              : "즐겨찾기에 추가했습니다",
          )
        }}
      />
    )
  }
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={breadcrumb.href} />}>
              {breadcrumb.label}
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div
        className={cn(
          "grid gap-5 rounded-2xl border border-border bg-card p-4 ring-1 ring-foreground/5 md:items-stretch md:p-5",
          isPairLayout
            ? "md:grid-cols-[128px_minmax(0,1fr)_auto]"
            : "md:grid-cols-[128px_minmax(0,1fr)_390px]",
        )}
      >
        {/* 왼쪽: 썸네일 */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted md:aspect-square md:size-32">
          <Image
            src={image || "/placeholder.svg"}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="200px"
          />
        </div>

        {/* 가운데: 배지, 제목, 태그 */}
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {badges}

            {hasHistory ? (
              <VersionSelect
                versions={versions!}
                value={selectedVersion}
                onValueChange={setSelectedVersion}
              />
            ) : (
              <Badge variant="outline" className="font-mono">
                {version}
              </Badge>
            )}
          </div>

          <h1
            className="mt-5 min-w-0 text-2xl font-semibold tracking-tight md:truncate md:whitespace-nowrap md:text-2xl"
            title={title}
          >
            {title}
          </h1>

          <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="ghost"
                className="text-muted-foreground"
              >
                #{tag}
              </Badge>
            ))}
          </div>

          {viewingPrevious && selectedEntry && (
            <div className="mt-3">
              <PreviousVersionNotice entry={selectedEntry} />
            </div>
          )}
        </div>

        {/* 오른쪽: 상단 AAS 액션 + 즐겨찾기, 하단 통계 + Deploy */}
        <div
          className={cn(
            "flex min-w-0 gap-5",
            isPairLayout
              ? "items-start justify-end"
              : "flex-col justify-between",
          )}
        >
          {/* 상단 액션 */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {actions}

            <Button
              variant="outline"
              size="icon"
              aria-label="즐겨찾기"
              aria-pressed={favorite}
              onClick={() => {
                setFavorite((current) => !current)

                toast.success(
                  favorite
                    ? "즐겨찾기에서 제거했습니다"
                    : "즐겨찾기에 추가했습니다",
                )
              }}
              className="h-12 w-12"
            >
              <Star
                className={cn(
                  "size-4",
                  favorite && "fill-amber-400 text-amber-400",
                )}
              />
            </Button>
          </div>

          {/* 하단: 다운로드 수 / 즐겨찾기 수 / Deploy 한 줄 정렬 */}
          {!isPairLayout && (
          <div className="flex flex-wrap items-center justify-end gap-y-4 sm:flex-nowrap sm:gap-y-0">
            {stats?.[0] && (
              <div className="flex min-w-24 flex-1 items-center justify-center gap-3 px-2 sm:min-w-32 sm:flex-none sm:px-4">
                <Download className="size-6 shrink-0 text-primary" />

                <div className="text-center">
                  <p className="text-2xl font-semibold leading-none tabular-nums">
                    {stats[0].value}
                  </p>
                  <p className="mt-1.5 whitespace-nowrap text-xs text-muted-foreground">
                    {stats[0].label}
                  </p>
                </div>
              </div>
            )}

            {stats?.[1] && (
              <>
                <div className="hidden h-14 w-px shrink-0 bg-border sm:block" />

                <div className="flex min-w-24 flex-1 items-center justify-center gap-3 px-2 sm:min-w-32 sm:flex-none sm:px-4">
                  <Star className="size-6 shrink-0 text-primary" />

                  <div>
                    <p className="text-2xl font-semibold leading-none tabular-nums">
                      {stats[1].value}
                    </p>
                    <p className="mt-1.5 whitespace-nowrap text-xs text-muted-foreground">
                      {stats[1].label}
                    </p>
                  </div>
                </div>
              </>
            )}

            {primaryAction && PrimaryIcon && (
              <>
                <div className="hidden h-14 w-px shrink-0 bg-border sm:block" />

                {primaryAction.href && !primaryAction.disabled ? (
                  <Button
                    nativeButton={false}
                    render={
                      <Link
                        href={primaryAction.href}
                        target={primaryAction.newTab ? "_blank" : undefined}
                        rel={primaryAction.newTab ? "noopener noreferrer" : undefined}
                      />
                    }
                    className="ml-0 h-12 grow basis-full rounded-2xl px-6 text-base sm:ml-5 sm:h-16 sm:grow-0 sm:basis-auto"
                  >
                    <PrimaryIcon className="size-5" />
                    {primaryAction.label}
                  </Button>
                ) : (
                  <Button
                    disabled={primaryAction.disabled}
                    title={primaryAction.disabledReason}
                    className="ml-0 h-12 grow basis-full rounded-2xl px-6 text-base sm:ml-5 sm:h-16 sm:grow-0 sm:basis-auto"
                    onClick={() =>
                      toast.info(`${primaryAction.label} 요청을 시작했습니다`)
                    }
                  >
                    <PrimaryIcon className="size-5" />
                    {primaryAction.label}
                  </Button>
                )}
              </>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

type PairDetailHeaderProps = {
  image: string
  imageAlt: string
  breadcrumb: { label: string; href: string }
  tags: string[]
  badges: React.ReactNode
  pairInfo: NonNullable<DetailHeaderProps["pairInfo"]>
  primaryAction?: DetailHeaderProps["primaryAction"]
  favorite: boolean
  onFavoriteChange: () => void
}

function PairDetailHeader({
  image,
  imageAlt,
  breadcrumb,
  tags,
  badges,
  pairInfo,
  primaryAction,
  favorite,
  onFavoriteChange,
}: PairDetailHeaderProps) {
  const { dataset, model } = pairInfo
  const PrimaryIcon = primaryAction?.icon

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={breadcrumb.href} />}>
              {breadcrumb.label}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{dataset.name} → {model.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 ring-1 ring-foreground/5 md:p-7">
        <Button
          variant="outline"
          size="icon"
          aria-label="즐겨찾기"
          aria-pressed={favorite}
          onClick={onFavoriteChange}
          className="absolute right-5 top-5 z-10 h-12 w-12 rounded-xl md:right-7 md:top-7"
        >
          <Star className={cn("size-4", favorite && "fill-amber-400 text-amber-400")} />
        </Button>

        <div className="grid gap-6 pr-0 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8 md:pr-14">
          <div className="relative aspect-square w-full max-w-[180px] overflow-hidden rounded-2xl bg-muted">
            <Image src={image || "/placeholder.svg"} alt={imageAlt} fill className="object-cover" sizes="180px" />
          </div>

          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold text-primary">AI Asset Pair</span>

            <div className="mt-7 grid min-w-0 gap-5 xl:grid-cols-[240px_160px_275px] xl:items-center xl:justify-between xl:gap-x-5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-chart-3/10 px-3 py-1 text-sm font-medium text-chart-3">
                  <Database className="size-4" />
                  AI Dataset
                </div>
                <h1 className="mt-3 w-[240px] max-w-full whitespace-normal break-words text-lg font-semibold tracking-tight text-pretty [overflow-wrap:anywhere] md:text-xl">{dataset.name}</h1>
              </div>

              <div className="flex w-full items-center py-2" aria-label="데이터셋이 모델 학습에 사용됨">
                <span className="h-px min-w-3 flex-1 bg-primary/30" />
                <span className="mx-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary whitespace-nowrap">
                  <Link2 className="size-3.5" />
                  학습에 사용됨
                </span>
                <span className="relative h-px min-w-3 flex-1 bg-primary/30">
                  <span className="absolute -right-px -top-[3px] size-1.5 rotate-45 border-r border-t border-primary/50" />
                </span>
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <Cpu className="size-4" />
                  AI Model
                </div>
                <h2 className="mt-3 w-[275px] max-w-full whitespace-normal break-words text-xl font-semibold tracking-tight text-pretty [overflow-wrap:anywhere] md:text-2xl">{model.name}</h2>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {badges}
                {tags.map((tag) => (
                  <Badge key={tag} variant="ghost" className="text-muted-foreground">#{tag}</Badge>
                ))}
              </div>

              {primaryAction && PrimaryIcon && (
                primaryAction.href && !primaryAction.disabled ? (
                  <Button
                    nativeButton={false}
                    render={
                      <Link
                        href={primaryAction.href}
                        target={primaryAction.newTab ? "_blank" : undefined}
                        rel={primaryAction.newTab ? "noopener noreferrer" : undefined}
                      />
                    }
                    className="h-12 rounded-2xl px-6 text-base"
                  >
                    <PrimaryIcon className="size-5" />
                    {primaryAction.label}
                  </Button>
                ) : (
                  <Button
                    disabled={primaryAction.disabled}
                    title={primaryAction.disabledReason}
                    className="h-12 rounded-2xl px-6 text-base"
                    onClick={() => toast.info(`${primaryAction.label} 요청을 시작했습니다`)}
                  >
                    <PrimaryIcon className="size-5" />
                    {primaryAction.label}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

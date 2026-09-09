"use client"

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  CircleCheck,
  CircleSlash,
  Cpu,
  Database,
  HardDrive,
  Info,
  ListChecks,
  Mail,
  MapPin,
  ScrollText,
  ShieldCheck,
  Tags,
  User,
  Workflow,
} from "lucide-react"

import { AasActions } from "@/components/registry/aas-actions"
import { DetailHeader } from "@/components/registry/detail-header"
import { DistributionChart } from "@/components/registry/distribution-chart"
import { LinkedModelCard } from "@/components/registry/linked-model-card"
import { InfoRow, StatTile } from "@/components/registry/stat-tile"
import { TaskBadge } from "@/components/registry/task-badge"
import { VersionTimeline } from "@/components/registry/version-timeline"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildDatasetAasEnv } from "@/lib/aas/mock-aas"
import { getModelsByDataset, getTaskThumbnail, type Dataset } from "@/lib/registry-data"

/** Parse a count string like "12,480" into a number. */
function toNumber(value: string) {
  const n = Number(value.replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

/** Format a number with thousands separators. */
function fmt(n: number) {
  return n.toLocaleString("ko-KR")
}

function BoolBadge({ value, trueLabel, falseLabel }: { value: boolean; trueLabel: string; falseLabel: string }) {
  return value ? (
    <Badge className="gap-1">
      <CircleCheck className="size-3.5" />
      {trueLabel}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleSlash className="size-3.5" />
      {falseLabel}
    </Badge>
  )
}

function registryBadge(status: Dataset["validation"]["registryStatus"]) {
  if (status === "검증 완료")
    return (
      <Badge className="gap-1">
        <BadgeCheck className="size-3.5" />
        {status}
      </Badge>
    )
  if (status === "검증 대기")
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangle className="size-3.5" />
        {status}
      </Badge>
    )
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="size-3.5" />
      {status}
    </Badge>
  )
}

export function DatasetDetail({ dataset }: { dataset: Dataset }) {
  const linkedModels = getModelsByDataset(dataset.id)

  const total = toNumber(dataset.totalSamples)
  const [trainPct, valPct, testPct] = dataset.splitRatio
  const trainSize = Math.round((total * trainPct) / 100)
  const valSize = Math.round((total * valPct) / 100)
  const testSize = total - trainSize - valSize
  const splitLabel = `${trainPct} : ${valPct} : ${testPct}`

  const metadataCompleteness = Math.round(
    dataset.quality.reduce((acc, q) => acc + q.value, 0) / dataset.quality.length,
  )

  const triggerClass = "data-active:text-foreground after:bg-primary"

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <DetailHeader
        image={getTaskThumbnail(dataset.task)}
        imageAlt={`${dataset.name} 미리보기`}
        title={dataset.name}
        version={dataset.version}
        versions={dataset.versions}
        breadcrumb={{ label: "AI Dataset", href: "/datasets" }}
        tags={dataset.tags}
        badges={
          <>
            <TaskBadge task={dataset.task} />
            <Badge variant="secondary" className="gap-1">
              <HardDrive className="size-3.5" />
              {dataset.dataType}
            </Badge>
          </>
        }
        stats={[
          { label: "다운로드", value: dataset.downloads.toLocaleString() },
          { label: "즐겨찾기", value: dataset.stars.toLocaleString() },
        ]}
        primaryAction={{ label: "Download", icon: Cpu }}
        actions={
          <AasActions
            entityId={dataset.id}
            entityKind="dataset"
            title={dataset.name}
            versionMeta={dataset.versions}
            env={buildDatasetAasEnv(dataset)}
          />
        }
      />

      <Tabs defaultValue="overview" className="gap-6">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList variant="line" className="w-max">
            <TabsTrigger value="overview" className={triggerClass}>
              개요
            </TabsTrigger>
            <TabsTrigger value="source" className={triggerClass}>
              데이터 출처
            </TabsTrigger>
            <TabsTrigger value="quality" className={triggerClass}>
              메타데이터 품질
            </TabsTrigger>
            <TabsTrigger value="links" className={triggerClass}>
              연계 정보
            </TabsTrigger>
            <TabsTrigger value="versions" className={triggerClass}>
              버전 히스토리
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 개요 — Training Dataset Summary */}
        <TabsContent value="overview" className="flex flex-col gap-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
            <StatTile label="Task 유형" value={dataset.task} accent />
            <StatTile label="라벨 수" value={dataset.classCount} suffix="종" />
            <StatTile label="전체 샘플" value={dataset.totalSamples} />
            <StatTile label="Train/Val/Test" value={splitLabel} />
            <StatTile label="저장 위치" value={dataset.storage.type} />
            <StatTile label="파일 형식" value={dataset.storage.fileType} />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex h-full flex-col gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ScrollText className="size-4 text-primary" />
                    기본 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="leading-relaxed text-muted-foreground">{dataset.description}</p>
                  <Separator />
                  <div>
                    <InfoRow
                      label="Dataset URI"
                      value={<span className="font-mono text-xs break-all">{dataset.storage.uri}</span>}
                    />
                    <InfoRow label="데이터셋 이름" value={dataset.name} />
                    <InfoRow label="버전" value={dataset.version} />
                    <InfoRow label="Task" value={dataset.task} />
                    <InfoRow label="생성일" value={dataset.createdAt} />
                    <InfoRow label="라이선스" value={dataset.license} />
                    <InfoRow
                      label="라벨링 여부 (Labeled)"
                      value={<BoolBadge value={dataset.labeled} trueLabel="라벨 있음" falseLabel="라벨 없음" />}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Storage Information */}
              <Card className="flex flex-1 flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="size-4 text-primary" />
                    스토리지 정보
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="저장소 유형" value={dataset.storage.type} />
                  <InfoRow
                    label="Base Path / URI"
                    value={<span className="font-mono text-xs break-all">{dataset.storage.basePath}</span>}
                  />
                  <InfoRow label="파일 형식" value={dataset.storage.fileType} />
                </CardContent>
              </Card>
            </div>

            {/* Label Information */}
            <div className="flex h-full flex-col">
              <Card className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="size-4 text-primary" />
                    라벨 정보
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex items-center justify-center py-2">
                    <div className="flex flex-1 items-center justify-center gap-3 px-4">
                      <Tags className="size-6 shrink-0 text-primary" />

                      <div className="text-center">
                        <p className="text-xl font-semibold tabular-nums">
                          {dataset.classCount}
                          <span className="ml-1 text-sm font-normal text-muted-foreground">
                            종
                          </span>
                        </p>

                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                          라벨 수
                        </p>
                      </div>
                    </div>

                    <div className="h-14 w-px shrink-0 bg-border" />

                    <div className="flex flex-1 items-center justify-center gap-3 px-4">
                      <Database className="size-6 shrink-0 text-primary" />

                      <div className="text-center">
                        <p className="text-xl font-semibold tabular-nums">
                          {dataset.totalSamples}
                        </p>

                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                          총 데이터 개수
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-1 flex-col gap-2">
                    <span className="text-xs font-medium text-muted-foreground">클래스 분포</span>
                    <DistributionChart
                      data={dataset.distribution}
                      collapsibleLegend
                      collapsedLegendRows={4}
                      collapsedLegendHeight={160}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Dataset Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4 text-primary" />
                데이터셋 요약 (Dataset Summary)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatTile label="전체 크기" value={fmt(total)} suffix="개" accent />
                <StatTile label="Train" value={fmt(trainSize)} suffix="개" />
                <StatTile label="Validation" value={fmt(valSize)} suffix="개" />
                <StatTile label="Test" value={fmt(testSize)} suffix="개" />
                <StatTile label="분할 비율" value={splitLabel} />
              </div>
              {/* Split ratio bar */}
              <div className="flex flex-col gap-2">
                <div className="flex h-3 w-full overflow-hidden rounded-full">
                  <span className="bg-chart-1" style={{ width: `${trainPct}%` }} aria-hidden />
                  <span className="bg-chart-2" style={{ width: `${valPct}%` }} aria-hidden />
                  <span className="bg-chart-4" style={{ width: `${testPct}%` }} aria-hidden />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-chart-1" /> Train {trainPct}%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-chart-2" /> Validation {valPct}%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-chart-4" /> Test {testPct}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 데이터 출처 — Data Source */}
        <TabsContent value="source" className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  담당자 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow
                  label="조직 (Organization)"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      {dataset.traceability.contactOrg}
                    </span>
                  }
                />
                <InfoRow label="부서 (Department)" value={dataset.traceability.department} />
                <InfoRow
                  label="담당자 (Contact Person)"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5 text-muted-foreground" />
                      {dataset.traceability.contactPerson}
                    </span>
                  }
                />
                <InfoRow
                  label="이메일 (Email)"
                  value={
                    <a
                      href={`mailto:${dataset.traceability.email}`}
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-primary underline-offset-4 hover:underline"
                    >
                      <Mail className="size-3.5" />
                      {dataset.traceability.email}
                    </a>
                  }
                />
              </CardContent>
            </Card>

            {/* Data Collection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="size-4 text-primary" />
                  데이터 수집 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow
                  label="수집 장치 (Data Collector)"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Camera className="size-3.5 text-muted-foreground" />
                      {dataset.traceability.dataCollector}
                    </span>
                  }
                />
                <InfoRow
                  label="수집 환경 (Collection Environment)"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-muted-foreground" />
                      {dataset.traceability.environmentConditions}
                    </span>
                  }
                />
                <InfoRow
                  label="추가 정보 (Additional Information)"
                  value={
                    <span className="inline-flex items-start gap-1.5 text-pretty">
                      <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      {dataset.traceability.additionalInfo}
                    </span>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 메타데이터 품질 — Metadata Quality */}
        <TabsContent value="quality" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                AAS 메타데이터 완전성
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">전체 완전성 (Completeness)</span>
                  <span className="text-lg font-semibold tabular-nums text-primary">{metadataCompleteness}%</span>
                </div>
                <Progress value={metadataCompleteness} />
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {dataset.quality.map((metric) => (
                  <div key={metric.label} className="flex flex-col gap-2 rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{metric.label}</span>
                      <span className="text-sm font-semibold tabular-nums text-primary">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} />
                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
            {/* Validation results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="size-4 text-primary" />
                  레지스트리 검증 결과
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <InfoRow label="Semantic ID 정합성" value={
                  dataset.validation.semanticIdValid ? (
                    <Badge className="gap-1"><CircleCheck className="size-3.5" />유효</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1"><CircleSlash className="size-3.5" />불일치</Badge>
                  )
                } />
                <InfoRow label="Registry 검증 상태" value={registryBadge(dataset.validation.registryStatus)} />
                <InfoRow label="필수 속성 충족" value={
                  dataset.validation.missingFields.length === 0 ? (
                    <Badge className="gap-1"><CircleCheck className="size-3.5" />완료</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <AlertTriangle className="size-3.5" />
                      {dataset.validation.missingFields.length}건 누락
                    </Badge>
                  )
                } />
              </CardContent>
            </Card>

            {/* Missing fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-primary" />
                  누락된 필수 필드
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dataset.validation.missingFields.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    <CircleCheck className="size-4 text-primary" />
                    누락된 필수 필드가 없습니다.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dataset.validation.missingFields.map((field) => (
                      <div
                        key={field}
                        className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm"
                      >
                        <AlertTriangle className="size-4 shrink-0 text-muted-foreground" />
                        <span className="font-mono text-xs">{field}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 연계 정보 — Linked Models + Traceability */}
        <TabsContent value="links" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="size-4 text-primary" />이 데이터셋을 사용하는 AI 모델
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4">
                <Badge className="gap-1.5">
                  <Database className="size-3.5" />
                  {dataset.name}
                </Badge>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {linkedModels.length}개 모델에 학습 데이터로 연계되어 있습니다
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {linkedModels.map((model) => (
                  <LinkedModelCard key={model.id} model={model} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 버전 히스토리 */}
        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle>버전 히스토리</CardTitle>
            </CardHeader>
            <CardContent>
              <VersionTimeline versions={dataset.versions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

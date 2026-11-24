import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { KeyValues, NextAction, StatusTag, TechDetails, type Tone } from "@/components/works/primitives"
import { getModelsByDataset, type Dataset } from "@/lib/registry-data"
import { TASK_KO, useCaseOf } from "@/lib/works/plain"

const STATUS_TONE: Record<Dataset["validation"]["registryStatus"], Tone> = {
  "검증 완료": "success",
  "검증 대기": "progress",
  "검증 실패": "danger",
}

export function DatasetDetailView({ dataset }: { dataset: Dataset }) {
  const users = getModelsByDataset(dataset.id)
  const classes = dataset.distribution.filter((c) => c.value > 0)
  const max = Math.max(...classes.map((c) => c.value), 1)
  const firstModel = users[0]

  return (
    <div className="flex flex-col">
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-10 md:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-14">
          <div className="flex flex-col gap-5">
            <nav aria-label="위치" className="text-sm text-muted-foreground">
              <Link href="/datasets" className="hover:underline">
                학습 데이터
              </Link>
            </nav>
            <p className="text-[15px] font-medium text-primary">
              {dataset.dataType} 데이터 · {TASK_KO[dataset.task]} AI 학습용
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">{dataset.name}</h1>
            <p className="text-xl leading-relaxed text-pretty">{dataset.description}</p>
            <div className="flex flex-wrap gap-3">
              <StatusTag tone={STATUS_TONE[dataset.validation.registryStatus]} size="lg">
                {dataset.validation.registryStatus}
              </StatusTag>
              <span className="self-center text-[15px] text-muted-foreground">
                {dataset.totalSamples}건 · 결함 종류 {classes.length}가지 · {dataset.traceability.dataCollector}
              </span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
            <Image src={dataset.image || "/placeholder.svg"} alt={`${dataset.name} 예시 이미지`} width={1000} height={700} className="aspect-[3/2] w-full object-cover" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-4 py-12 md:px-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-bold tracking-tight">무엇이 담겨 있나요?</h2>
          <ul className="flex flex-col gap-3">
            {classes.map((c) => (
              <li key={c.label} className="flex flex-col gap-1.5">
                <span className="flex justify-between text-[15px]">
                  <span className="font-medium">{c.label}</span>
                  <span className="tabular-nums text-muted-foreground">{c.value.toLocaleString()}건</span>
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(c.value / max) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            학습 {dataset.splitRatio[0]}% · 검증 {dataset.splitRatio[1]}% · 평가 {dataset.splitRatio[2]}%로 나눠 사용했어요.
          </p>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-bold tracking-tight">이 데이터로 배운 AI</h2>
          {users.length ? (
            <ul className="flex flex-col gap-3">
              {users.map((m) => (
                <li key={m.id}>
                  <Link href={`/models/${m.id}`} className="flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-border hover:shadow-md">
                    <Image src={m.image || "/placeholder.svg"} alt="" width={64} height={64} className="size-14 rounded-lg object-cover" />
                    <span className="flex flex-1 flex-col">
                      <span className="text-lg font-semibold">{m.name}</span>
                      <span className="text-sm text-muted-foreground">{useCaseOf(m.task).problem}</span>
                    </span>
                    <ArrowRight aria-hidden className="size-5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-[15px] text-muted-foreground">
              아직 이 데이터로 학습한 AI가 없어요.
            </p>
          )}
          <div className="flex flex-col gap-2 rounded-xl bg-secondary p-5">
            <h3 className="text-[15px] font-semibold text-primary">내 데이터를 비슷하게 준비하려면</h3>
            <p className="text-[15px] leading-relaxed">
              폴더를 <span className="font-mono text-sm">{dataset.directoryStructure.join(" ")}</span>처럼 나누고, 라벨은{" "}
              {dataset.storage.annotationFormat} 형식으로 담아 .zip으로 묶어 주세요.
            </p>
          </div>
        </section>

        <TechDetails title="기술 정보" hint="저장 위치, 라이선스, 수집 정보, 전처리, 버전 기록" className="lg:col-span-2">
          <div className="flex flex-col gap-6">
            <KeyValues
              items={[
                { label: "버전", value: dataset.version },
                { label: "라이선스", value: dataset.license },
                { label: "라벨 유형", value: dataset.labelType },
                { label: "파일 형식", value: `${dataset.storage.fileType} · ${dataset.storage.annotationFormat}` },
                { label: "저장 위치", value: dataset.storage.uri },
                { label: "담당", value: `${dataset.traceability.department} · ${dataset.traceability.contactPerson}` },
                { label: "수집 환경", value: dataset.traceability.environmentConditions },
                { label: "전처리", value: dataset.preprocessing.join(", ") },
              ]}
            />
            <ul className="flex flex-col gap-2">
              {dataset.versions.map((v) => (
                <li key={v.version} className="flex flex-wrap gap-x-3 text-[15px]">
                  <span className="font-mono font-medium">{v.version}</span>
                  <span className="text-muted-foreground">{v.date}</span>
                  <span>{v.changes}</span>
                </li>
              ))}
            </ul>
            <Link href={`/datasets/${dataset.id}/aas/edit`} className="self-start text-[15px] font-medium text-primary hover:underline">
              AAS 메타데이터 보기·편집
            </Link>
          </div>
        </TechDetails>

        {firstModel ? (
          <NextAction
            className="lg:col-span-2"
            title={`${firstModel.name}를 직접 해보세요`}
            description="이 데이터로 배운 AI에 사진 한 장을 넣고 결과를 확인할 수 있어요."
            primary={{ href: `/models/${firstModel.id}/deploy`, label: "추론 해보기" }}
            secondary={{ href: `/training?model=${firstModel.id}`, label: "내 데이터로 추가 학습" }}
          />
        ) : null}
      </div>
    </div>
  )
}

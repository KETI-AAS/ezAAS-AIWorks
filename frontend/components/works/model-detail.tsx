import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { SetCurrentModel } from "@/components/works/set-current-model"
import { KeyValues, NextAction, PrimaryLink, StatusTag, TechDetails } from "@/components/works/primitives"
import { getDataset, getRelatedModels, type Model } from "@/lib/registry-data"
import { useCaseOf } from "@/lib/works/plain"

export function ModelDetailView({ model }: { model: Model }) {
  const dataset = getDataset(model.datasetId)
  const uc = useCaseOf(model.task)
  const related = getRelatedModels(model).slice(0, 3)
  const classes = dataset?.distribution.filter((c) => c.value > 0) ?? []

  return (
    <div className="flex flex-col">
      <SetCurrentModel modelId={model.id} />

      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-10 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:py-14">
          <div className="flex flex-col gap-6">
            <nav aria-label="위치" className="text-sm text-muted-foreground">
              <Link href="/models" className="hover:underline">
                AI 찾아보기
              </Link>
              {" / "}
              <Link href={`/models?task=${encodeURIComponent(model.task)}`} className="hover:underline">
                {uc.problem}
              </Link>
            </nav>
            <div className="flex flex-col gap-3">
              <p className="text-[15px] font-medium text-primary">{uc.problem}</p>
              <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">{model.name}</h1>
              <p className="text-xl font-medium leading-relaxed text-pretty">{model.purpose}</p>
            </div>
            <p className="max-w-2xl text-[17px] leading-relaxed text-muted-foreground text-pretty">{model.description}</p>
            <div className="flex flex-wrap items-center gap-3">
              <StatusTag tone="success" size="lg">
                등록·검증 완료 · 바로 해볼 수 있어요
              </StatusTag>
              <span className="text-sm text-muted-foreground">{model.industry} 현장용</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <PrimaryLink href={`/models/${model.id}/deploy`}>
                내 사진으로 추론 해보기 <ArrowRight aria-hidden className="size-4" />
              </PrimaryLink>
              <PrimaryLink href={`/training?model=${model.id}`} variant="outline">
                우리 데이터로 추가 학습
              </PrimaryLink>
            </div>
          </div>
          <figure className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
              <Image
                src={model.resultImage || "/placeholder.svg"}
                alt={`${model.name}의 결과 예시: ${model.outputDescription}`}
                width={1200}
                height={800}
                priority
                className="aspect-[3/2] w-full object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full bg-card/95 px-3 py-1.5 text-sm font-medium shadow-sm">
                이런 결과를 받아요 · 예시
              </span>
            </div>
            <figcaption className="text-[15px] text-muted-foreground">{model.outputDescription}</figcaption>
          </figure>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-14 px-4 py-12 md:px-8">
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">이렇게 동작해요</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            <li className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
              <span className="text-sm font-medium text-muted-foreground">1 · 넣는 것</span>
              <p className="text-xl font-semibold">{uc.inputKind}</p>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{model.input}</p>
              {dataset?.columns.map((c) => (
                <p key={c.name} className="text-sm text-muted-foreground">
                  {c.label}
                  {c.required ? " (필수)" : ""} — {c.description}
                </p>
              ))}
            </li>
            <li className="flex flex-col gap-3 rounded-2xl bg-secondary p-6">
              <span className="text-sm font-medium text-primary">2 · AI가 하는 일</span>
              <p className="text-xl font-semibold">{uc.problem}</p>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{`"${uc.question}"`}에 답하도록 학습됐어요.</p>
            </li>
            <li className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
              <span className="text-sm font-medium text-muted-foreground">3 · 받는 것</span>
              <p className="text-xl font-semibold">{uc.outputKind}</p>
              <ul className="flex flex-wrap gap-2">
                {model.outputItems.map((o) => (
                  <li key={o} className="rounded-md bg-muted px-2.5 py-1 text-sm font-medium">
                    {o}
                  </li>
                ))}
              </ul>
            </li>
          </ol>
        </section>

        {dataset ? (
          <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-bold tracking-tight">어떤 데이터로 배웠나요?</h2>
              <p className="text-[17px] leading-relaxed text-muted-foreground text-pretty">
                이 AI는 <strong className="font-semibold text-foreground">{dataset.name}</strong>
                {`(${dataset.totalSamples}건)으로 학습했어요. 우리 현장 사진이 이 데이터와 비슷할수록 결과가 잘 맞을 가능성이 높습니다.`}
              </p>
              <Link
                href={`/datasets/${dataset.id}`}
                className="inline-flex items-center gap-1 text-[15px] font-semibold text-primary hover:underline"
              >
                학습 데이터 자세히 보기 <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <Link
              href={`/pairs/${model.id}--${dataset.id}`}
              className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5 hover:shadow-md"
            >
              <Image src={dataset.image || "/placeholder.svg"} alt="" width={140} height={105} className="aspect-[4/3] w-32 rounded-lg object-cover" />
              <div className="flex flex-col gap-2">
                <span className="text-lg font-semibold">{dataset.name}</span>
                <span className="text-[15px] text-muted-foreground">배운 결함 종류</span>
                <span className="flex flex-wrap gap-1.5">
                  {classes.map((c) => (
                    <span key={c.label} className="rounded-md bg-muted px-2 py-0.5 text-sm">
                      {c.label}
                    </span>
                  ))}
                </span>
              </div>
            </Link>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight">등록 정보에 적힌 성능</h2>
            <p className="text-[15px] text-muted-foreground">
              개발자가 학습 데이터로 측정해 등록한 값이에요. 우리 데이터에서도 같은 성능이 나오는지는 직접 해봐야 알 수 있어요.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {model.metrics.map((m) => (
              <li key={m.name} className="flex flex-col gap-1 rounded-xl bg-card px-4 py-3 ring-1 ring-border">
                <span className="text-sm text-muted-foreground">{m.name}</span>
                <span className="text-2xl font-semibold tabular-nums">{m.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <TechDetails title="기술 정보" hint="프레임워크, 입출력 형식, 학습 설정, 버전 기록, AAS 메타데이터">
          <div className="flex flex-col gap-8">
            <KeyValues
              items={[
                { label: "프레임워크", value: model.framework },
                { label: "버전", value: model.version },
                { label: "구조", value: model.architecture },
                { label: "언어", value: model.programLanguage },
                { label: "모델 파일", value: model.modelFileExtension },
                { label: "저장 위치", value: model.storagePath },
                { label: "결과 형식", value: model.outputFormat },
                { label: "실행 환경", value: model.supportedEnv.join(", ") },
              ]}
            />
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-[15px] font-semibold">입력 텐서</h3>
                {model.inputs.map((i) => (
                  <p key={i.name} className="font-mono text-sm">
                    {i.name} · {i.type} {i.shape} <span className="font-sans text-muted-foreground">— {i.description}</span>
                  </p>
                ))}
                <h3 className="mt-3 text-[15px] font-semibold">출력 텐서</h3>
                {model.outputs.map((o) => (
                  <p key={o.name} className="font-mono text-sm">
                    {o.name} · {o.type} {o.shape} <span className="font-sans text-muted-foreground">— {o.description}</span>
                  </p>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[15px] font-semibold">학습 설정</h3>
                <KeyValues items={model.hyperparameters} mono />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-[15px] font-semibold">버전 기록</h3>
              <ul className="flex flex-col gap-2">
                {model.versions.map((v) => (
                  <li key={v.version} className="flex flex-wrap gap-x-3 text-[15px]">
                    <span className="font-mono font-medium">{v.version}</span>
                    <span className="text-muted-foreground">{v.date}</span>
                    <span>{v.changes}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href={`/models/${model.id}/aas/edit`} className="self-start text-[15px] font-medium text-primary hover:underline">
              AAS 메타데이터 보기·편집
            </Link>
          </div>
        </TechDetails>

        {related.length ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">비슷한 문제를 푸는 다른 AI</h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/models/${r.id}`} className="flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-border hover:shadow-md">
                    <Image src={r.image || "/placeholder.svg"} alt="" width={64} height={64} className="size-14 rounded-lg object-cover" />
                    <span className="flex flex-col">
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-sm text-muted-foreground">{useCaseOf(r.task).problem}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <NextAction
          title="사진 한 장으로 이 AI를 직접 해보세요"
          description="예시 사진이나 내 사진을 넣으면 AI가 어떤 결과를 주는지 바로 볼 수 있어요."
          primary={{ href: `/models/${model.id}/deploy`, label: "추론 해보기" }}
          secondary={{ href: `/training?model=${model.id}`, label: "우리 데이터로 추가 학습" }}
        />
      </div>
    </div>
  )
}

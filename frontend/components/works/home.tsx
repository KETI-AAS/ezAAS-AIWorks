import { ArrowRight, ArrowUpRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { InputOutput, PrimaryLink } from "@/components/works/primitives"
import { getDataset, getModel, models } from "@/lib/registry-data"
import { USE_CASES } from "@/lib/works/plain"

const EXAMPLE_ID = "yolov8-car-inspection"

export function Home() {
  const example = getModel(EXAMPLE_ID)!
  const exampleData = getDataset(example.datasetId)!

  const journey = [
    {
      title: "어떤 AI인지 알아보기",
      body: "무엇을 넣으면 무엇이 나오는지, 어떤 데이터로 배웠는지 확인해요.",
      href: `/models/${example.id}`,
      cta: "소개 보기",
    },
    {
      title: "사진 한 장으로 해보기",
      body: "예시 사진이나 내 사진을 넣고 AI가 결함을 어떻게 표시하는지 봐요.",
      href: `/models/${example.id}/deploy`,
      cta: "추론 해보기",
    },
    {
      title: "내 데이터 올리기",
      body: "우리 라인 사진을 올리면 AI가 쓸 수 있는 형태로 자동 정리해요.",
      href: `/training?model=${example.id}`,
      cta: "데이터 올리기",
    },
    {
      title: "우리 라인에 맞게 추가 학습",
      body: "정리된 데이터로 모델을 한 번 더 학습시키고 전후 결과를 비교해요.",
      href: `/training?model=${example.id}&view=result`,
      cta: "결과 예시 보기",
    },
  ]

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 md:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-16">
          <div className="flex flex-col gap-6">
            <p className="text-[15px] font-medium text-primary">제조 현장을 위한 AI 체험 공간</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl">
              우리 공정의 문제, AI로 먼저 해보고 결정하세요
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              검사·설비·문서 업무에 쓸 수 있는 AI를 찾아보고, 사진이나 데이터 한 건으로 바로 실행해 볼 수 있어요. 마음에
              들면 우리 데이터로 추가 학습까지 이어갈 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <PrimaryLink href="/models">
                어떤 AI가 있는지 보기
                <ArrowRight aria-hidden className="size-4" />
              </PrimaryLink>
              <PrimaryLink href={`/models/${example.id}/deploy`} variant="outline">
                예시 AI 바로 실행해 보기
              </PrimaryLink>
            </div>
          </div>

          <figure className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
              <Image
                src={example.resultImage || "/placeholder.svg"}
                alt="자동차 외관 사진 위에 AI가 결함 위치를 상자로 표시한 결과 예시"
                width={1200}
                height={800}
                priority
                className="aspect-[3/2] w-full object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full bg-card/95 px-3 py-1.5 text-sm font-medium shadow-sm">
                결과 예시
              </span>
            </div>
            <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted-foreground">
              <span>
                <strong className="font-semibold text-foreground">{example.name}</strong>가 차량 사진에서 결함 위치를 표시한
                모습
              </span>
              <span>샘플 이미지</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto w-full max-w-[1400px] px-4 py-14 md:px-8">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight">어떤 문제를 풀고 싶나요?</h2>
            <p className="text-lg text-muted-foreground">하고 싶은 일을 고르면 맞는 AI를 보여 드려요.</p>
          </div>
          <Link href="/models" className="inline-flex items-center gap-1 text-[15px] font-medium text-primary hover:underline">
            모든 AI 보기 <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {USE_CASES.map((u, i) => {
            const count = models.filter((m) => m.task === u.task).length
            return (
              <li key={u.task} className={i === 0 ? "md:col-span-2 xl:col-span-1 xl:row-span-2" : ""}>
                <Link
                  href={`/models?task=${encodeURIComponent(u.task)}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className={i === 0 ? "relative aspect-[16/9] xl:aspect-auto xl:flex-1" : "relative aspect-[16/7]"}>
                    <Image src={u.thumbnail || "/placeholder.svg"} alt="" fill sizes="(min-width:1280px) 33vw, 50vw" className="object-cover" />
                  </div>
                  <div className="flex flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl font-semibold">{u.problem}</h3>
                      <ArrowUpRight aria-hidden className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <p className="text-[15px] leading-relaxed text-muted-foreground">{`"${u.question}"`}</p>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{u.inputKind}</span>
                      <span className="text-muted-foreground">{" → "}</span>
                      <span className="font-medium">{u.outputKind}</span>
                      <span className="text-muted-foreground">{` · AI ${count}개`}</span>
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Follow one example */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 md:px-8 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="flex flex-col gap-5">
            <p className="text-[15px] font-medium text-primary">한 가지 AI로 처음부터 끝까지</p>
            <h2 className="text-3xl font-bold tracking-tight text-balance">{example.name}로 따라가 보기</h2>
            <p className="text-lg leading-relaxed text-muted-foreground text-pretty">{example.purpose}에 쓰는 AI예요.</p>
            <InputOutput input={example.input} output={example.output} />
            <p className="text-sm text-muted-foreground">
              학습 데이터:{" "}
              <Link href={`/datasets/${exampleData.id}`} className="font-medium text-primary hover:underline">
                {exampleData.name}
              </Link>
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            {journey.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-3 bg-card p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="flex-1 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
                <Link href={step.href} className="inline-flex items-center gap-1 text-[15px] font-semibold text-primary hover:underline">
                  {step.cta} <ArrowRight aria-hidden className="size-4" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Register */}
      <section className="mx-auto w-full max-w-[1400px] px-4 py-14 md:px-8">
        <div className="grid gap-8 rounded-2xl bg-foreground p-8 text-background md:grid-cols-[1.3fr_1fr] md:items-center md:p-10">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold text-balance md:text-3xl">Model Hub에 올린 모델이나 데이터가 있나요?</h2>
            <p className="text-[17px] leading-relaxed text-background/75 text-pretty">
              Model Hub의 instance에 실제 파일(모델은 .pt, 데이터셋은 .zip)을 연결하면 AI Works 자산으로 등록돼요. 등록 후
              파일 검증이 끝나면 다른 사람도 찾아보고 실행해 볼 수 있습니다.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
            >
              내 자산 등록하러 가기 <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Inference } from "@/components/works/inference"
import { getDataset, getModel, models } from "@/lib/registry-data"

export function generateStaticParams() {
  return models.map((model) => ({ id: model.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const model = getModel(id)
  if (!model) return { title: "추론 · AI Works" }
  return {
    title: `${model.name} 추론 해보기 · AI Works`,
    description: `${model.name}에 사진이나 데이터를 넣고 결과를 바로 확인해 보세요.`,
  }
}

export default async function ModelDeployPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const model = getModel(id)
  if (!model) notFound()
  const dataset = getDataset(model.datasetId)
  if (!dataset) notFound()
  return <Inference model={model} dataset={dataset} />
}

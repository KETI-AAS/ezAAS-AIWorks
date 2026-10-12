import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ModelDeployWorkbench } from "@/components/model/model-deploy-workbench"
import { getDataset, getModel, models } from "@/lib/registry-data"

export function generateStaticParams() {
  return models.map((model) => ({ id: model.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const model = getModel(id)

  if (!model) return { title: "추론 · Model Not Found" }

  return {
    title: `${model.name} 추론`,
    description: `${model.name} 모델의 일회용 추론 환경`,
  }
}

export default async function ModelDeployPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const model = getModel(id)

  if (!model) notFound()
  const dataset = getDataset(model.datasetId)
  if (!dataset) notFound()

  return <ModelDeployWorkbench model={model} dataset={dataset} />
}

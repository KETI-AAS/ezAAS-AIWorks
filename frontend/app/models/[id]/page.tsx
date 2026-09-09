import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getModel, models } from "@/lib/registry-data"
import { ModelDetail } from "@/components/model/model-detail"

export function generateStaticParams() {
  return models.map((m) => ({ id: m.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const model = getModel(id)
  if (!model) return { title: "Model Not Found" }
  return {
    title: `${model.name} · Model`,
    description: model.description,
  }
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const model = getModel(id)
  if (!model) notFound()
  return <ModelDetail model={model} />
}

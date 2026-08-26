import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AasEditLayout } from "@/components/registry/aas-edit-layout"
import { buildModelAasEnv } from "@/lib/aas/mock-aas"
import { getModel, models } from "@/lib/registry-data"

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
  return { title: `${model.name} · AAS 모델 수정` }
}

export default async function ModelAasEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const model = getModel(id)
  if (!model) notFound()

  return (
    <AasEditLayout
      entityId={model.id}
      entityKind="model"
      title={model.name}
      listLabel="AI Model"
      listHref="/models"
      backHref={`/models/${model.id}`}
      versionMeta={model.versions}
      env={buildModelAasEnv(model)}
    />
  )
}

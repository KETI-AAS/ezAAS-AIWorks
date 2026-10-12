import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AasEditLayout } from "@/components/registry/aas-edit-layout"
import { buildDatasetAasEnv } from "@/lib/aas/mock-aas"
import { datasets, getDataset } from "@/lib/registry-data"

export function generateStaticParams() {
  return datasets.map((d) => ({ id: d.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const dataset = getDataset(id)
  if (!dataset) return { title: "Dataset Not Found" }
  return { title: `${dataset.name} · AAS 모델 수정` }
}

export default async function DatasetAasEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dataset = getDataset(id)
  if (!dataset) notFound()

  return (
    <AasEditLayout
      entityId={dataset.id}
      entityKind="dataset"
      title={dataset.name}
      listLabel="AI Dataset"
      listHref="/datasets"
      backHref={`/datasets/${dataset.id}`}
      versionMeta={dataset.versions}
      env={buildDatasetAasEnv(dataset)}
    />
  )
}

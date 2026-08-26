import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getDataset, datasets } from "@/lib/registry-data"
import { DatasetDetail } from "@/components/dataset/dataset-detail"

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
  return {
    title: `${dataset.name} · Dataset`,
    description: dataset.description,
  }
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dataset = getDataset(id)
  if (!dataset) notFound()
  return <DatasetDetail dataset={dataset} />
}

import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PairDetail } from "@/components/pairs/pair-detail"
import { assetPairs, getAssetPair } from "@/lib/registry-data"

export function generateStaticParams() {
  return assetPairs.map((p) => ({ id: p.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const pair = getAssetPair(id)
  if (!pair) return { title: "Asset Pair Not Found" }
  return {
    title: `${pair.title} · AI Asset Pair`,
    description: pair.description,
  }
}

export default async function PairPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pair = getAssetPair(id)
  if (!pair) notFound()
  return <PairDetail pair={pair} />
}

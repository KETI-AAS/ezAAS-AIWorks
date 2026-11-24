"use client"

import { useCallback } from "react"

import { DatasetCard } from "@/components/registry/dataset-card"
import { RegistryExplorer, type SortOption } from "@/components/registry/registry-explorer"
import { datasets, type Dataset } from "@/lib/registry-data"
import {
  datasetFacetValues,
  datasetFilterGroups,
  datasetSampleCount,
} from "@/lib/registry-facets"

const sortOptions: SortOption[] = [
  { key: "latest", label: "최신순" },
  { key: "performance", label: "성능순" },
  { key: "usage", label: "사용량순" },
]

export function DatasetExplorer() {
  const getId = useCallback((d: Dataset) => d.id, [])
  const getFacetValues = useCallback((d: Dataset) => datasetFacetValues(d), [])
  const getSearchText = useCallback(
    (d: Dataset) => `${d.name} ${d.description} ${d.task} ${d.industry} ${d.tags.join(" ")}`,
    [],
  )
  const sortItems = useCallback((items: Dataset[], key: string) => {
    const sorted = [...items]
    switch (key) {
      case "performance":
        sorted.sort((a, b) => datasetSampleCount(b) - datasetSampleCount(a))
        break
      case "usage":
        sorted.sort((a, b) => b.downloads - a.downloads)
        break
      default:
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return sorted
  }, [])
  const renderCard = useCallback(
    (d: Dataset, i: number) => <DatasetCard dataset={d} index={i} />,
    [],
  )

  return (
    <RegistryExplorer<Dataset>
      title="AI Dataset"
      description="AI 모델 학습에 사용된 데이터셋입니다. 적용 작업, 데이터 유형, 활용 분야 등 여러 조건을 조합해 원하는 데이터셋을 탐색하세요."
      searchPlaceholder="데이터셋 이름, 태그, 활용 분야로 검색하세요"
      items={datasets}
      groups={datasetFilterGroups}
      sortOptions={sortOptions}
      defaultSort="latest"
      countNoun="데이터셋"
      getId={getId}
      getFacetValues={getFacetValues}
      getSearchText={getSearchText}
      sortItems={sortItems}
      renderCard={renderCard}
    />
  )
}

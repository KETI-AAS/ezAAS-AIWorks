"use client"

import { useCallback, useEffect, useState } from "react"

import { ModelCard } from "@/components/registry/model-card"
import { RegistryExplorer, type SortOption } from "@/components/registry/registry-explorer"
import { models, type Model } from "@/lib/registry-data"
import { modelDate, modelFacetValues, modelFilterGroups, modelStats } from "@/lib/registry-facets"
import {
  getModelValidation,
  MODEL_VALIDATION_EVENT,
  type ModelValidationStatus,
} from "@/lib/model-validation-store"

const sortOptions: SortOption[] = [
  { key: "latest", label: "최신순" },
  { key: "performance", label: "성능순" },
  { key: "usage", label: "사용량순" },
]

export function ModelExplorer() {
  const [validationByModel, setValidationByModel] = useState<Record<string, ModelValidationStatus>>(
    () => Object.fromEntries(models.map((model) => [model.id, "valid"])),
  )

  useEffect(() => {
    const refresh = () => {
      const next = Object.fromEntries(
        models.map((model) => [model.id, getModelValidation(model.id)?.status ?? "valid"]),
      ) as Record<string, ModelValidationStatus>
      setValidationByModel((current) =>
        models.every((model) => current[model.id] === next[model.id]) ? current : next,
      )
    }

    refresh()
    const interval = window.setInterval(refresh, 500)
    window.addEventListener("storage", refresh)
    window.addEventListener(MODEL_VALIDATION_EVENT, refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("storage", refresh)
      window.removeEventListener(MODEL_VALIDATION_EVENT, refresh)
    }
  }, [])

  const getId = useCallback((m: Model) => m.id, [])
  const getFacetValues = useCallback(
    (m: Model) => modelFacetValues(m, validationByModel[m.id] ?? "valid"),
    [validationByModel],
  )
  const getSearchText = useCallback(
    (m: Model) =>
      `${m.name} ${m.description} ${m.task} ${m.framework} ${m.architecture} ${m.tags.join(" ")}`,
    [],
  )
  const sortItems = useCallback((items: Model[], key: string) => {
    const sorted = [...items]
    switch (key) {
      case "performance":
        sorted.sort((a, b) => b.accuracy - a.accuracy)
        break
      case "usage":
        sorted.sort((a, b) => modelStats(b).usage - modelStats(a).usage)
        break
      default:
        sorted.sort((a, b) => modelDate(b).localeCompare(modelDate(a)))
    }
    return sorted
  }, [])
  const renderCard = useCallback((m: Model, i: number) => <ModelCard model={m} index={i} />, [])

  return (
    <RegistryExplorer<Model>
      title="AI Model"
      description="제조 현장의 문제를 해결하는 AI 모델 카탈로그입니다. 적용 작업, 프레임워크, 아키텍처, 성능 지표 등으로 원하는 모델을 탐색하세요."
      searchPlaceholder="모델 이름, 적용 작업, 프레임워크, 태그로 검색하세요"
      items={models}
      groups={modelFilterGroups}
      sortOptions={sortOptions}
      defaultSort="latest"
      countNoun="모델"
      getId={getId}
      getFacetValues={getFacetValues}
      getSearchText={getSearchText}
      sortItems={sortItems}
      renderCard={renderCard}
    />
  )
}

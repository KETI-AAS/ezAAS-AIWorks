"use client"

import { useEffect, useState } from "react"

import {
  getModelValidation,
  MODEL_VALIDATION_EVENT,
  type ModelValidationRecord,
} from "@/lib/model-validation-store"

export function useModelValidation(modelId: string) {
  const [validation, setValidation] = useState<ModelValidationRecord | null>(null)

  useEffect(() => {
    const refresh = () => setValidation(getModelValidation(modelId))
    refresh()
    const interval = window.setInterval(refresh, 500)
    window.addEventListener("storage", refresh)
    window.addEventListener(MODEL_VALIDATION_EVENT, refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("storage", refresh)
      window.removeEventListener(MODEL_VALIDATION_EVENT, refresh)
    }
  }, [modelId])

  return validation
}

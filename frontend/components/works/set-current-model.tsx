"use client"

import { useEffect } from "react"

import { setCurrentModel } from "@/lib/works/work-context"

export function SetCurrentModel({ modelId }: { modelId: string }) {
  useEffect(() => {
    setCurrentModel(modelId)
  }, [modelId])
  return null
}

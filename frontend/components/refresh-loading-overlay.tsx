"use client"

import { useEffect } from "react"
import { LoaderCircle } from "lucide-react"

const MINIMUM_VISIBLE_TIME = 500

export function RefreshLoadingOverlay() {
  useEffect(() => {
    const root = document.documentElement

    if (root.dataset.refreshing !== "true") return

    const startedAt = Number(root.dataset.refreshStartedAt) || performance.now()
    const remainingTime = Math.max(0, MINIMUM_VISIBLE_TIME - (performance.now() - startedAt))
    const timeout = window.setTimeout(() => {
      delete root.dataset.refreshing
      delete root.dataset.refreshStartedAt
    }, remainingTime)

    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <div
      id="refresh-loading-overlay"
      role="status"
      aria-live="polite"
      aria-label="페이지 로딩 중"
      className="fixed inset-0 z-[9999] hidden items-center justify-center bg-background/90 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-8 py-6 shadow-lg">
        <LoaderCircle className="size-7 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">로딩 중...</p>
      </div>
    </div>
  )
}

"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import {
  type BackgroundJob,
  type JobStatus,
  type JobType,
  describeJob,
} from "@/lib/background-jobs"

type JobInput = {
  id: string
  type: JobType
  status: JobStatus
  title: string
}

type BackgroundJobContextValue = {
  jobs: BackgroundJob[]
  unreadCount: number
  /** Create or update a job. Emits a toast only on a running -> settled transition. */
  upsertJob: (input: JobInput) => void
  markAllRead: () => void
  clearJobs: () => void
}

const BackgroundJobContext = createContext<BackgroundJobContextValue | null>(null)

export function BackgroundJobProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  // Remembers the last status seen per job so we only react to real transitions.
  const prevStatus = useRef<Map<string, JobStatus>>(new Map())

  const upsertJob = useCallback((input: JobInput) => {
    const now = Date.now()
    const previous = prevStatus.current.get(input.id)
    const settledNow =
      previous === "running" && (input.status === "completed" || input.status === "failed")

    setJobs((current) => {
      const next = current.filter((job) => job.id !== input.id)
      next.unshift({ ...input, updatedAt: now })
      return next
    })

    if (settledNow) {
      setUnreadCount((count) => count + 1)
      const message = describeJob(input)
      if (input.status === "completed") toast.success(message)
      else toast.error(message)
    }

    prevStatus.current.set(input.id, input.status)
  }, [])

  const markAllRead = useCallback(() => setUnreadCount(0), [])

  const clearJobs = useCallback(() => {
    setJobs([])
    setUnreadCount(0)
    prevStatus.current.clear()
  }, [])

  // Demo seed: an already-finished training job plus a preprocessing job that
  // completes shortly after load, so the bell shows a real running -> completed
  // transition with a toast. Replace this effect with real polling/SSE/WebSocket
  // updates that call `upsertJob({ id, type, status, title })`.
  useEffect(() => {
    const now = Date.now()
    setJobs([
      {
        id: "seed-training",
        type: "training",
        status: "completed",
        title: "표면 결함 탐지 v2",
        updatedAt: now - 60_000,
      },
      {
        id: "seed-preprocessing",
        type: "preprocessing",
        status: "running",
        title: "legacy_data.csv",
        updatedAt: now,
      },
    ])
    setUnreadCount(1)
    prevStatus.current.set("seed-training", "completed")
    prevStatus.current.set("seed-preprocessing", "running")

    const timer = setTimeout(() => {
      upsertJob({
        id: "seed-preprocessing",
        type: "preprocessing",
        status: "completed",
        title: "legacy_data.csv",
      })
    }, 6000)
    return () => clearTimeout(timer)
  }, [upsertJob])

  const value = useMemo<BackgroundJobContextValue>(
    () => ({ jobs, unreadCount, upsertJob, markAllRead, clearJobs }),
    [jobs, unreadCount, upsertJob, markAllRead, clearJobs],
  )

  return (
    <BackgroundJobContext.Provider value={value}>{children}</BackgroundJobContext.Provider>
  )
}

export function useBackgroundJobs() {
  const ctx = useContext(BackgroundJobContext)
  if (!ctx) {
    throw new Error("useBackgroundJobs must be used within a BackgroundJobProvider")
  }
  return ctx
}

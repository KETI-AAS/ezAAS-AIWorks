export type JobType = "training" | "preprocessing"

export type JobStatus = "running" | "completed" | "failed"

export interface BackgroundJob {
  id: string
  type: JobType
  status: JobStatus
  /** Short human title, e.g. the target model or dataset name. */
  title: string
  /** Epoch millis when the job entered its current status. */
  updatedAt: number
}

const JOB_TYPE_LABEL: Record<JobType, string> = {
  training: "AI Training",
  preprocessing: "자동 전처리",
}

export function jobTypeLabel(type: JobType): string {
  return JOB_TYPE_LABEL[type]
}

/** One-line description of a job's current state, used in toasts and the list. */
export function describeJob(job: Pick<BackgroundJob, "type" | "status">): string {
  const label = JOB_TYPE_LABEL[job.type]
  switch (job.status) {
    case "running":
      return `${label} 진행 중`
    case "completed":
      return `${label} 완료`
    case "failed":
      return `${label} 실패`
  }
}

/** Compact Korean relative-time formatter. */
export function formatRelativeTime(from: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - from)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "방금 전"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  return `${day}일 전`
}

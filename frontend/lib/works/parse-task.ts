import type { TaskType } from "@/lib/registry-data"
import { USE_CASES } from "@/lib/works/plain"

export function parseTask(value?: string | null): TaskType | null {
  if (!value) return null
  return USE_CASES.find((u) => u.task === value)?.task ?? null
}

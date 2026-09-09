export type ModelValidationStatus = "validating" | "valid" | "invalid"

export type ModelValidationRecord = {
  modelId: string
  pairIds: string[]
  fileName: string
  status: ModelValidationStatus
  outcome: Exclude<ModelValidationStatus, "validating">
  message: string
  startedAt: number
  readyAt: number
}

const STORAGE_KEY = "ai-model-validation-records-v1"
export const MODEL_VALIDATION_EVENT = "ai-model-validation-change"

function readRecords(): Record<string, ModelValidationRecord> {
  if (typeof window === "undefined") return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as unknown
    return parsed && typeof parsed === "object" ? parsed as Record<string, ModelValidationRecord> : {}
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return {}
  }
}

function writeRecords(records: Record<string, ModelValidationRecord>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  window.dispatchEvent(new Event(MODEL_VALIDATION_EVENT))
}

export function startModelValidation(
  input: Omit<ModelValidationRecord, "status" | "startedAt" | "readyAt"> & { durationMs?: number },
) {
  const startedAt = Date.now()
  const record: ModelValidationRecord = {
    ...input,
    status: "validating",
    startedAt,
    readyAt: startedAt + (input.durationMs ?? 15_000),
  }
  const records = readRecords()
  records[input.modelId] = record
  writeRecords(records)
  return record
}

export function getModelValidation(modelId: string): ModelValidationRecord | null {
  const records = readRecords()
  const record = records[modelId]
  if (!record) return null

  if (record.status === "validating" && Date.now() >= record.readyAt) {
    const resolved = { ...record, status: record.outcome }
    records[modelId] = resolved
    writeRecords(records)
    return resolved
  }

  return record
}

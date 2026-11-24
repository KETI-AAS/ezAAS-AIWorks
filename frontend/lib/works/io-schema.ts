import type { Dataset, Model, TaskType } from "@/lib/registry-data"

/**
 * Inference input/output contract, derived from the model's registered
 * metadata (`dataType`, `inputs`, `outputs`) and its linked dataset
 * (`columns`, `distribution`). Anything the registry does not define is
 * returned with `demo: true` so the UI can label it as a demo value.
 */

export type SeriesChannel = {
  name: string
  label: string
  unit?: string
  required: boolean
  /** Not in the registry; demo range used only for prototype validation. */
  range: { min: number; max: number; demo: true }
}

export type ImageInputSpec = {
  kind: "image"
  task: TaskType
  accept: string
  tensorShape: string
  description: string
  classes: string[]
}

export type SeriesInputSpec = {
  kind: "timeseries"
  task: TaskType
  windowLength: number
  channels: SeriesChannel[]
  tensorShape: string
  description: string
  /** Optional timestamp column. Not defined in the registry schema. */
  timestamp: { name: "timestamp"; required: false; demo: true }
  faultLabels: string[]
  /** Not in the registry; demo cut-off for "이상" status. */
  threshold: { value: number; demo: true }
}

export type InputSpec = ImageInputSpec | SeriesInputSpec

const DEMO_RANGES: Record<string, { min: number; max: number }> = {
  TEMP_01: { min: -20, max: 150 },
  VIB_VEL: { min: 0, max: 50 },
  MOTOR_A: { min: 0, max: 100 },
}

function parseWindowLength(shape: string): number {
  const dims = shape.replace(/[[\]\s]/g, "").split(",").map(Number)
  return dims.length >= 3 && Number.isFinite(dims[1]) ? dims[1] : 1
}

function classLabels(dataset: Dataset) {
  return dataset.distribution.filter((d) => d.value > 0).map((d) => d.label)
}

export function inputSpecOf(model: Model, dataset: Dataset): InputSpec {
  const tensor = model.inputs[0]
  if (model.dataType === "시계열") {
    const numeric = dataset.columns.filter((c) => c.type === "number")
    return {
      kind: "timeseries",
      task: model.task,
      windowLength: parseWindowLength(tensor?.shape ?? ""),
      tensorShape: tensor?.shape ?? "-",
      description: tensor?.description ?? model.input,
      channels: numeric.map((c) => ({
        name: c.name,
        label: c.label,
        unit: c.unit,
        required: c.required ?? false,
        range: { ...(DEMO_RANGES[c.name] ?? { min: -1e6, max: 1e6 }), demo: true },
      })),
      timestamp: { name: "timestamp", required: false, demo: true },
      faultLabels: classLabels(dataset),
      threshold: { value: 0.5, demo: true },
    }
  }
  return {
    kind: "image",
    task: model.task,
    accept: model.task === "OCR" ? "image/png,image/jpeg,image/tiff" : "image/png,image/jpeg",
    tensorShape: tensor?.shape ?? "-",
    description: model.input,
    classes: classLabels(dataset),
  }
}

/* ------------------------------ time series ------------------------------ */

export type SeriesRow = { timestamp?: string; values: Record<string, number | null> }

export type SeriesIssue = { row?: number; column?: string; message: string }

/** Deterministic demo window that matches the spec (length × channels). */
export function sampleSeries(spec: SeriesInputSpec, withSpike = true): SeriesRow[] {
  const start = Date.UTC(2026, 10, 24, 0, 0, 0)
  return Array.from({ length: spec.windowLength }, (_, i) => {
    const spike = withSpike && i > spec.windowLength * 0.72 && i < spec.windowLength * 0.8
    const values: Record<string, number | null> = {}
    for (const ch of spec.channels) {
      const base =
        ch.name === "TEMP_01" ? 62 + Math.sin(i / 18) * 2.5 : ch.name === "VIB_VEL" ? 4.2 + Math.sin(i / 6) * 0.6 : 18 + Math.cos(i / 11) * 1.2
      const bump = spike ? (ch.name === "VIB_VEL" ? 9 : ch.name === "TEMP_01" ? 6 : 3) : 0
      values[ch.name] = Math.round((base + bump) * 100) / 100
    }
    return { timestamp: new Date(start + i * 1000).toISOString().slice(11, 19), values }
  })
}

export function parseSeriesCsv(text: string, spec: SeriesInputSpec): { rows: SeriesRow[]; issues: SeriesIssue[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const issues: SeriesIssue[] = []
  if (lines.length < 2) return { rows: [], issues: [{ message: "머리글과 값이 있는 CSV가 필요해요." }] }
  const header = lines[0].split(",").map((h) => h.trim())
  const missing = spec.channels.filter((c) => c.required && !header.includes(c.name))
  if (missing.length) {
    return { rows: [], issues: [{ message: `필수 열이 없어요: ${missing.map((m) => m.name).join(", ")}` }] }
  }
  const tsIdx = header.indexOf("timestamp")
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim())
    const values: Record<string, number | null> = {}
    for (const ch of spec.channels) {
      const raw = cells[header.indexOf(ch.name)]
      values[ch.name] = raw === undefined || raw === "" ? null : Number(raw)
    }
    return { timestamp: tsIdx >= 0 ? cells[tsIdx] : undefined, values }
  })
  return { rows, issues }
}

export function validateSeries(rows: SeriesRow[], spec: SeriesInputSpec): SeriesIssue[] {
  const issues: SeriesIssue[] = []
  if (rows.length < spec.windowLength) {
    issues.push({ message: `값이 ${rows.length}줄이에요. 이 AI는 연속된 ${spec.windowLength}줄이 필요해요.` })
  }
  rows.forEach((r, i) => {
    for (const ch of spec.channels) {
      const v = r.values[ch.name]
      if (v === null || v === undefined) {
        if (ch.required) issues.push({ row: i + 1, column: ch.name, message: `${i + 1}번째 줄 ${ch.label} 값이 비어 있어요.` })
      } else if (!Number.isFinite(v)) {
        issues.push({ row: i + 1, column: ch.name, message: `${i + 1}번째 줄 ${ch.label} 값이 숫자가 아니에요.` })
      } else if (v < ch.range.min || v > ch.range.max) {
        issues.push({
          row: i + 1,
          column: ch.name,
          message: `${i + 1}번째 줄 ${ch.label} ${v}${ch.unit ?? ""}가 범위(${ch.range.min}–${ch.range.max})를 벗어났어요.`,
        })
      }
    }
  })
  return issues
}

export function seriesToCsv(rows: SeriesRow[], spec: SeriesInputSpec) {
  const head = ["timestamp", ...spec.channels.map((c) => c.name)].join(",")
  const body = rows.map((r) => [r.timestamp ?? "", ...spec.channels.map((c) => r.values[c.name] ?? "")].join(","))
  return [head, ...body].join("\n")
}

/** Demo result following the registered output contract (anomaly_score, fault_type, rul_days). */
export function demoSeriesResult(rows: SeriesRow[], spec: SeriesInputSpec) {
  const vib = spec.channels.find((c) => c.name === "VIB_VEL")?.name ?? spec.channels[0]?.name
  const values = rows.map((r) => r.values[vib] ?? 0)
  const mean = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1)
  const peakIdx = values.reduce((best, v, i) => (v > values[best] ? i : best), 0)
  const ratio = values[peakIdx] / Math.max(mean, 0.0001)
  const score = Math.min(0.98, Math.max(0.04, (ratio - 1) / 2.4))
  const anomalous = score >= spec.threshold.value
  const faultIndex = anomalous ? Math.min(1, spec.faultLabels.length - 1) : 0
  const windowStart = Math.max(0, peakIdx - 10)
  const windowEnd = Math.min(rows.length - 1, peakIdx + 10)
  return {
    score: Math.round(score * 100) / 100,
    anomalous,
    faultType: spec.faultLabels[faultIndex] ?? "-",
    rulDays: anomalous ? 18 : 120,
    peakIdx,
    window: [windowStart, windowEnd] as [number, number],
  }
}

/* --------------------------------- image --------------------------------- */

export type Box = { label: string; score: number; x: number; y: number; w: number; h: number }

export function demoImageResult(spec: ImageInputSpec) {
  const c = (i: number) => spec.classes[i] ?? `class_${i}`
  switch (spec.task) {
    case "Object Detection":
      return {
        kind: "boxes" as const,
        boxes: [
          { label: c(0), score: 0.94, x: 18, y: 52, w: 22, h: 16 },
          { label: c(1), score: 0.88, x: 62, y: 38, w: 18, h: 20 },
          { label: c(2), score: 0.71, x: 40, y: 18, w: 16, h: 12 },
        ] satisfies Box[],
      }
    case "Segmentation":
      return {
        kind: "mask" as const,
        regions: [
          { label: c(4), areaPct: 3.2, x: 30, y: 40, w: 18, h: 14 },
          { label: c(1), areaPct: 1.4, x: 66, y: 22, w: 10, h: 26 },
        ],
      }
    case "Classification":
      return {
        kind: "probs" as const,
        probs: [0.86, 0.06, 0.04, 0.03, 0.01].map((p, i) => ({ label: c(i), p })),
      }
    case "OCR":
      return {
        kind: "text" as const,
        lines: [
          { text: "작업지시서 No. 2026-1124", confidence: 0.97 },
          { text: "품번 AX-3012 / 수량 240", confidence: 0.93 },
          { text: "공정: 도장 후 외관 검사", confidence: 0.9 },
          { text: "검사자 서명 (판독 불확실)", confidence: 0.61 },
        ],
      }
    default:
      return { kind: "probs" as const, probs: [] }
  }
}

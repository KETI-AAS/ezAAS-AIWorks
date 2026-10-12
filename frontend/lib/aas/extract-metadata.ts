/**
 * Best-effort metadata extraction + submodel classification for an uploaded
 * AAS Environment.
 *
 * Given a raw AAS Environment JSON, this module:
 *   1. Detects which submodels look like an "AI Dataset" and which look like an
 *      "AI ModelNameplate" (auto-detection; the UI allows manual correction).
 *   2. Extracts whatever registration fields it can find from those submodels,
 *      so the form can lock the auto-filled values and only ask the user for the
 *      values that could not be pulled from the template.
 *
 * Pure module — no React / DOM dependencies.
 */

import type {
  AasEnvironment,
  AasReference,
  LangString,
  Submodel,
  SubmodelElement,
} from "./aas-types"

export type AssetKind = "dataset" | "model" | "none"

export type DetectedSubmodel = {
  /** Stable key (submodel id, else idShort, else index). */
  key: string
  idShort: string
  id: string
  elementCount: number
  semantic?: string
  autoKind: AssetKind
  submodel: Submodel
}

export type DatasetMeta = {
  title?: string
  author?: string
  version?: string
  summary?: string
  dataType?: string
  fileType?: string
  task?: string
  license?: string
  keywords?: string
}

export type ModelMeta = {
  title?: string
  author?: string
  version?: string
  summary?: string
  framework?: string
  task?: string
  license?: string
  keywords?: string
}

export type AasAnalysis = {
  submodels: DetectedSubmodel[]
  datasetKey?: string
  modelKey?: string
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Normalize a label for fuzzy, case/separator-insensitive matching. */
function norm(s?: string): string {
  return (s || "").toLowerCase().replace(/[\s_\-.]/g, "")
}

function firstText(description?: LangString[]): string | undefined {
  if (!Array.isArray(description) || description.length === 0) return undefined
  return description.find((d) => d?.text)?.text ?? undefined
}

function referenceValue(ref?: AasReference): string | undefined {
  if (!ref?.keys || ref.keys.length === 0) return undefined
  return ref.keys[ref.keys.length - 1]?.value
}

function langValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value.find(
      (v) => v && typeof v === "object" && "text" in v,
    ) as LangString | undefined
    return first?.text
  }
  return undefined
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

/** Guess whether a submodel represents a dataset, a model nameplate, or neither. */
function classify(sm: Submodel): AssetKind {
  const haystack = [
    norm(sm.idShort),
    norm(referenceValue(sm.semanticId)),
    norm(firstText(sm.description)),
  ].join(" ")

  // "dataset" is a specific signal. Note that a dataset submodel may still be
  // called "...Nameplate" (e.g. AIDatasetNameplate), so "nameplate" on its own
  // must NOT be treated as a model signal — only explicit model tokens are.
  const isDataset = /dataset|trainingdata|datacard/.test(haystack)
  const isModel = /modelnameplate|aimodel|mlmodel|modelcard|neuralnetwork|inferencemodel/.test(
    haystack,
  )

  if (isDataset) return "dataset"
  if (isModel) return "model"
  // Loose fallbacks for less structured shells.
  if (/nameplate|\bmodel/.test(haystack)) return "model"
  return "none"
}

/* ------------------------------------------------------------------ */
/* Property extraction                                                 */
/* ------------------------------------------------------------------ */

/** Recursively collect leaf property values keyed by normalized idShort. */
function collectProps(
  elements: SubmodelElement[] | undefined,
  out: Map<string, string>,
): void {
  if (!Array.isArray(elements)) return
  for (const el of elements) {
    const modelType = (el.modelType as string) || "Property"
    if (
      modelType === "SubmodelElementCollection" ||
      modelType === "SubmodelElementList"
    ) {
      if (Array.isArray(el.value)) {
        collectProps(el.value as SubmodelElement[], out)
      }
      continue
    }
    if (modelType === "MultiLanguageProperty") {
      const v = langValue(el.value)
      if (el.idShort && v) out.set(norm(el.idShort), v)
      continue
    }
    const v =
      typeof el.value === "string" || typeof el.value === "number"
        ? String(el.value)
        : undefined
    if (el.idShort && v != null && v.trim() !== "") {
      out.set(norm(el.idShort), v)
    }
  }
}

/** Read an exact property from a named AAS collection (e.g. Metadata.Filetype). */
function pickCollectionProperty(
  elements: SubmodelElement[] | undefined,
  collectionName: string,
  propertyNames: string[],
): string | undefined {
  if (!Array.isArray(elements)) return undefined
  for (const element of elements) {
    const isCollection =
      element.modelType === "SubmodelElementCollection" ||
      element.modelType === "SubmodelElementList"
    if (!isCollection || !Array.isArray(element.value)) continue

    if (norm(element.idShort) === norm(collectionName)) {
      for (const child of element.value as SubmodelElement[]) {
        if (!propertyNames.some((name) => norm(child.idShort) === norm(name))) continue
        const value =
          typeof child.value === "string" || typeof child.value === "number"
            ? String(child.value).trim()
            : undefined
        if (value) return value
      }
    }

    const nested = pickCollectionProperty(
      element.value as SubmodelElement[],
      collectionName,
      propertyNames,
    )
    if (nested) return nested
  }
  return undefined
}

/** Find the first property whose key exactly or loosely matches an alias. */
function pick(props: Map<string, string>, aliases: string[]): string | undefined {
  for (const a of aliases) {
    const key = norm(a)
    const hit = props.get(key)
    if (hit) return hit
  }
  for (const [k, v] of props) {
    if (aliases.some((a) => k.includes(norm(a)))) return v
  }
  return undefined
}

const ALIASES = {
  title: [
    "title",
    "name",
    "modelname",
    "datasetname",
    "designation",
    "assetname",
    "productdesignation",
    "manufacturerproductdesignation",
    "productname",
  ],
  author: [
    "author",
    "manufacturer",
    "manufacturername",
    "owner",
    "creator",
    "vendor",
    "provider",
    "team",
    "organization",
  ],
  version: [
    "version",
    "modelversion",
    "datasetversion",
    "versionnumber",
    "hardwareversion",
    "firmwareversion",
    "softwareversion",
    "revision",
  ],
  summary: ["summary", "description", "comment", "note", "abstract", "remark"],
  dataType: ["datatype", "datacategory", "modality", "dataformat", "datakind"],
  fileType: ["filetype", "fileformat", "extension"],
  task: ["task", "tasktype", "usecase", "application", "purpose", "problemtype"],
  framework: ["framework", "mlframework", "runtime", "library", "backend", "toolkit"],
  license: ["license", "licence", "licensetype", "usageright", "accessright"],
  keywords: ["keywords", "keyword", "tags", "tag", "labels"],
}

export function extractDatasetMeta(sm: Submodel): DatasetMeta {
  const props = new Map<string, string>()
  collectProps(sm.submodelElements, props)
  return {
    title: sm.idShort,
    author: pick(props, ALIASES.author),
    version: pick(props, ALIASES.version),
    summary: pick(props, ALIASES.summary) ?? firstText(sm.description),
    dataType: pick(props, ALIASES.dataType),
    fileType:
      pickCollectionProperty(sm.submodelElements, "Metadata", ["Filetype", "FileType"]) ??
      pick(props, ALIASES.fileType),
    task: pick(props, ALIASES.task),
    license: pick(props, ALIASES.license),
    keywords: pick(props, ALIASES.keywords),
  }
}

export function extractModelMeta(sm: Submodel): ModelMeta {
  const props = new Map<string, string>()
  collectProps(sm.submodelElements, props)
  return {
    title: sm.idShort,
    author: pick(props, ALIASES.author),
    version: pick(props, ALIASES.version),
    summary: pick(props, ALIASES.summary) ?? firstText(sm.description),
    framework: pick(props, ALIASES.framework),
    task: pick(props, ALIASES.task),
    license: pick(props, ALIASES.license),
    keywords: pick(props, ALIASES.keywords),
  }
}

/* ------------------------------------------------------------------ */
/* Top-level analysis                                                  */
/* ------------------------------------------------------------------ */

/** Classify every submodel in an environment and pick default AID / AIMN. */
export function analyzeAas(env: AasEnvironment): AasAnalysis {
  const submodels = Array.isArray(env.submodels) ? env.submodels : []
  const detected: DetectedSubmodel[] = submodels.map((sm, i) => ({
    key: sm.id || sm.idShort || `submodel-${i}`,
    idShort: sm.idShort || sm.id || `Submodel ${i + 1}`,
    id: sm.id || "",
    elementCount: Array.isArray(sm.submodelElements)
      ? sm.submodelElements.length
      : 0,
    semantic: referenceValue(sm.semanticId),
    autoKind: classify(sm),
    submodel: sm,
  }))

  return {
    submodels: detected,
    datasetKey: detected.find((d) => d.autoKind === "dataset")?.key,
    modelKey: detected.find((d) => d.autoKind === "model")?.key,
  }
}

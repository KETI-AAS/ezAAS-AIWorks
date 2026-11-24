/**
 * Shared AAS (Asset Administration Shell) types.
 *
 * These describe both the *raw* AAS Environment JSON (as uploaded) and the
 * *normalized* tree structure that the viewer renders. Keep this module free of
 * React so it can be reused by Register, AI Dataset Detail, AI Model Detail and
 * Pair Detail.
 */

/* ------------------------------------------------------------------ */
/* Normalized tree                                                     */
/* ------------------------------------------------------------------ */

export type AasNodeType =
  | "Environment"
  | "AssetAdministrationShell"
  | "AssetInformation"
  | "Submodel"
  | "SubmodelElementCollection"
  | "SubmodelElementList"
  | "Property"
  | "MultiLanguageProperty"
  | "File"
  | "Blob"
  | "Range"
  | "ReferenceElement"
  | "RelationshipElement"
  | "Entity"
  | "Operation"
  | "ConceptDescription"
  | "Reference"
  | "Group"
  | "Attribute"

/** Semantic reference shown in the property panel. */
export type SemanticRef = {
  type?: string
  keys?: { type?: string; value?: string }[]
}

export type TreeNode = {
  id: string
  label: string
  type: AasNodeType
  /** Identifier and source metadata retained from the original AAS object. */
  externalId?: string
  idShort?: string
  modelType?: string
  /** JSON path used to map a tree edit back to the source metadata. */
  valuePath?: string
  /** Original, unformatted value and source object retained for detail views. */
  originalValue?: unknown
  rawData?: Record<string, unknown>
  conceptDescription?: ConceptDescription
  /** Optional scalar value shown for leaf nodes (e.g. Property value). */
  value?: string
  /** Optional short tag shown next to the label (e.g. valueType, count). */
  badge?: string
  /** AAS valueType (e.g. xs:string) surfaced in the property panel. */
  valueType?: string
  /** MIME type for File / Blob elements. */
  contentType?: string
  /** Human-readable description (first language string). */
  description?: string
  /** Language tag associated with the description / value. */
  language?: string
  /** Semantic identifier reference. */
  semanticId?: SemanticRef
  children?: TreeNode[]
}

/* ------------------------------------------------------------------ */
/* Raw AAS Environment (v3 JSON serialization)                         */
/* ------------------------------------------------------------------ */

export type LangString = {
  language?: string
  text?: string
}

export type ReferenceKey = {
  type?: string
  value?: string
}

export type AasReference = {
  type?: string
  keys?: ReferenceKey[]
}

export type SubmodelElement = {
  idShort?: string
  modelType?: string
  value?: unknown
  valueType?: string
  contentType?: string
  semanticId?: AasReference
  description?: LangString[]
  [key: string]: unknown
}

export type Submodel = {
  idShort?: string
  id?: string
  kind?: string
  semanticId?: AasReference
  description?: LangString[]
  submodelElements?: SubmodelElement[]
  [key: string]: unknown
}

export type AssetInformation = {
  assetKind?: string
  globalAssetId?: string
  [key: string]: unknown
}

export type AssetAdministrationShell = {
  idShort?: string
  id?: string
  description?: LangString[]
  assetInformation?: AssetInformation
  submodels?: AasReference[]
  [key: string]: unknown
}

export type ConceptDescription = {
  idShort?: string
  id?: string
  description?: LangString[]
  [key: string]: unknown
}

export type AasEnvironment = {
  assetAdministrationShells?: AssetAdministrationShell[]
  submodels?: Submodel[]
  conceptDescriptions?: ConceptDescription[]
  [key: string]: unknown
}

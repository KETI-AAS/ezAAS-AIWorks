/**
 * Builds the logical AAS tree used by the legacy AAS viewer:
 * AAS references are resolved to top-level Submodels and structural
 * SubmodelElements are recursively exposed through `children`.
 */

import type {
  AasEnvironment,
  AasNodeType,
  AasReference,
  AssetAdministrationShell,
  ConceptDescription,
  LangString,
  Submodel,
  SubmodelElement,
  TreeNode,
} from "./aas-types"

let uid = 0
function nextId(prefix: string): string {
  uid += 1
  return `${prefix}-${uid}`
}

function firstText(description?: LangString[]): string | undefined {
  return description?.find((item) => item?.text)?.text
}

function referenceValue(reference?: AasReference): string | undefined {
  return reference?.keys?.[0]?.value
}

function modelTypeOf(value: Record<string, unknown>): AasNodeType {
  const type = typeof value.modelType === "string" ? value.modelType : "Property"
  const supported: AasNodeType[] = [
    "Submodel",
    "SubmodelElementCollection",
    "SubmodelElementList",
    "Property",
    "MultiLanguageProperty",
    "File",
    "Blob",
    "Range",
    "ReferenceElement",
    "RelationshipElement",
    "Entity",
    "Operation",
  ]
  return supported.includes(type as AasNodeType)
    ? (type as AasNodeType)
    : "Property"
}

function scalarValue(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return undefined
}

function linkedConceptDescription(
  semanticId: AasReference | undefined,
  conceptDescriptions: ConceptDescription[],
): ConceptDescription | undefined {
  const key = semanticId?.keys?.[0]
  if (key?.type !== "ConceptDescription") return undefined
  return conceptDescriptions.find((item) => item.id === key.value)
}

/** Equivalent to the legacy parsingSub function, adapted to TreeNode. */
function mapSubmodelNode(
  obj: Submodel | SubmodelElement,
  valuePath: string,
  conceptDescriptions: ConceptDescription[],
): TreeNode {
  const raw = obj as Record<string, unknown>
  const modelType = typeof obj.modelType === "string" ? obj.modelType : "Property"
  const externalId = typeof raw.id === "string" ? raw.id : referenceValue(obj.semanticId)
  const type = modelTypeOf(raw)

  let structuralChildren: SubmodelElement[] = []
  let childKey: "submodelElements" | "value" | "statements" | undefined
  if (modelType === "Submodel") {
    structuralChildren = Array.isArray((obj as Submodel).submodelElements)
      ? (obj as Submodel).submodelElements!
      : []
    childKey = "submodelElements"
  } else if (
    modelType === "SubmodelElementCollection" ||
    modelType === "SubmodelElementList"
  ) {
    structuralChildren = Array.isArray(obj.value)
      ? (obj.value as SubmodelElement[])
      : []
    childKey = "value"
  } else if (modelType === "Entity") {
    structuralChildren = Array.isArray(raw.statements)
      ? (raw.statements as SubmodelElement[])
      : []
    childKey = "statements"
  }

  const rawData = { ...raw }
  if (childKey) delete rawData[childKey]
  const idShort = obj.idShort
  const label = idShort || externalId || modelType

  return {
    id: nextId("aas-node"),
    label,
    type,
    externalId,
    idShort,
    modelType,
    valuePath,
    originalValue: obj.value,
    rawData,
    conceptDescription: linkedConceptDescription(obj.semanticId, conceptDescriptions),
    value: scalarValue(obj.value),
    badge: typeof raw.valueType === "string" ? (raw.valueType as string) : undefined,
    valueType: typeof raw.valueType === "string" ? (raw.valueType as string) : undefined,
    contentType: typeof raw.contentType === "string" ? (raw.contentType as string) : undefined,
    description: firstText(obj.description),
    semanticId: obj.semanticId,
    children: structuralChildren.map((child, index) =>
      mapSubmodelNode(
        child,
        `${valuePath}.${childKey}[${index}]`,
        conceptDescriptions,
      ),
    ),
  }
}

function mapShell(
  shell: AssetAdministrationShell,
  shellIndex: number,
  submodels: Submodel[],
  conceptDescriptions: ConceptDescription[],
): TreeNode {
  const path = `assetAdministrationShells[${shellIndex}]`
  const rawData = { ...(shell as Record<string, unknown>) }
  delete rawData.submodels

  const children = (shell.submodels ?? []).flatMap((reference) => {
    const key = reference.keys?.[0]
    const submodelIndex = submodels.findIndex(
      (candidate) => candidate.modelType === key?.type && candidate.id === key?.value,
    )
    if (submodelIndex < 0) return []
    return [
      mapSubmodelNode(
        submodels[submodelIndex],
        `submodels[${submodelIndex}]`,
        conceptDescriptions,
      ),
    ]
  })

  return {
    id: nextId("aas"),
    label: shell.idShort || shell.id || "AssetAdministrationShell",
    type: "AssetAdministrationShell",
    externalId: shell.id,
    idShort: shell.idShort,
    modelType: "AssetAdministrationShell",
    valuePath: path,
    rawData,
    description: firstText(shell.description),
    badge: children.length ? `${children.length}` : undefined,
    children,
  }
}

function mapConceptDescription(cd: ConceptDescription, index: number): TreeNode {
  return {
    id: nextId("cd"),
    label: cd.idShort || cd.id || "ConceptDescription",
    type: "ConceptDescription",
    externalId: cd.id,
    idShort: cd.idShort,
    modelType: "ConceptDescription",
    valuePath: `conceptDescriptions[${index}]`,
    rawData: { ...(cd as Record<string, unknown>) },
    description: firstText(cd.description),
  }
}

export function parseAasTree(env: AasEnvironment): TreeNode {
  uid = 0
  const shells = Array.isArray(env.assetAdministrationShells)
    ? env.assetAdministrationShells
    : []
  const submodels = Array.isArray(env.submodels) ? env.submodels : []
  const conceptDescriptions = Array.isArray(env.conceptDescriptions)
    ? env.conceptDescriptions
    : []

  const shellNodes = shells.map((shell, index) =>
    mapShell(shell, index, submodels, conceptDescriptions),
  )

  // Keep ConceptDescriptions accessible in the single-pane viewer while the
  // model hierarchy itself follows parsingAAS's resolved-reference structure.
  if (conceptDescriptions.length > 0) {
    shellNodes.push({
      id: nextId("cd-group"),
      label: "ConceptDescriptions",
      type: "Group",
      badge: `${conceptDescriptions.length}`,
      children: conceptDescriptions.map(mapConceptDescription),
    })
  }

  return {
    id: nextId("env"),
    label: "AAS Environment",
    type: "Environment",
    children: shellNodes,
  }
}

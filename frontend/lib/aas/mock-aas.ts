/**
 * Mock AAS Environment builders.
 *
 * These turn a registry Model or Dataset into a realistic AAS Environment JSON
 * object (v3 serialization) so the shared parser + viewer have real content to
 * render. This is the single place that fabricates AAS data; when a real
 * backend is wired later, only these functions need to be replaced with a fetch
 * — the viewer, editor and version store stay identical.
 */

import type { Dataset, Model } from "@/lib/registry-data"
import type {
  AasEnvironment,
  AasReference,
  SubmodelElement,
} from "./aas-types"

/** Build an ECLASS/IEC-style external semantic reference. */
function semanticRef(value: string): AasReference {
  return {
    type: "ExternalReference",
    keys: [{ type: "GlobalReference", value }],
  }
}

function prop(
  idShort: string,
  value: string | number,
  valueType = "xs:string",
  semantic?: string,
): SubmodelElement {
  return {
    idShort,
    modelType: "Property",
    valueType,
    value: String(value),
    ...(semantic ? { semanticId: semanticRef(semantic) } : {}),
  }
}

function mlp(idShort: string, text: string, language = "ko"): SubmodelElement {
  return {
    idShort,
    modelType: "MultiLanguageProperty",
    value: [{ language, text }],
  }
}

function file(idShort: string, value: string, contentType: string): SubmodelElement {
  return { idShort, modelType: "File", value, contentType }
}

function collection(
  idShort: string,
  value: SubmodelElement[],
  semantic?: string,
): SubmodelElement {
  return {
    idShort,
    modelType: "SubmodelElementCollection",
    value,
    ...(semantic ? { semanticId: semanticRef(semantic) } : {}),
  }
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

export function buildModelAasEnv(model: Model): AasEnvironment {
  const nameplate = {
    idShort: "AIModelNameplate",
    id: `urn:aas:sm:model:${model.id}:nameplate`,
    modelType: "Submodel",
    kind: "Instance",
    semanticId: semanticRef("https://admin-shell.io/idta/AIModelNameplate/1/0"),
    description: [
      { language: "ko", text: "AI 모델의 식별 및 명세 정보를 기술하는 서브모델입니다." },
    ],
    submodelElements: [
      collection("GeneralInformation", [
        prop("ModelName", model.name),
        prop("Version", model.version),
        prop("Task", model.task),
        prop("Industry", model.industry),
        prop("Framework", model.framework),
        prop("Architecture", model.architecture),
        prop("ProgramLanguage", model.programLanguage),
        mlp("Description", model.description),
      ]),
      collection("TechnicalProperties", [
        prop("Accuracy", model.accuracy, "xs:float"),
        prop("Precision", model.precision, "xs:float"),
        prop("Recall", model.recall, "xs:float"),
        prop("F1Score", model.f1, "xs:float"),
        prop("ModelFileExtension", model.modelFileExtension),
        prop("StoragePath", model.storagePath),
      ]),
      collection(
        "HyperParameters",
        model.hyperparameters.map((h) =>
          prop(h.label.replace(/\s+/g, ""), h.value),
        ),
      ),
      collection(
        "Inputs",
        model.inputs.map((input, i) =>
          collection(`Input_${i + 1}`, [
            prop("Name", input.name),
            prop("Type", input.type),
            prop("Shape", input.shape),
            mlp("Description", input.description),
          ]),
        ),
      ),
      collection(
        "Outputs",
        model.outputs.map((output, i) =>
          collection(`Output_${i + 1}`, [
            prop("Name", output.name),
            prop("Type", output.type),
            prop("Shape", output.shape),
            mlp("Description", output.description),
          ]),
        ),
      ),
      collection("Artifacts", [
        file(
          "ModelFile",
          `${model.storagePath}/model${model.modelFileExtension}`,
          "application/octet-stream",
        ),
        file("Thumbnail", model.image, "image/png"),
      ]),
    ],
  }

  const environment = {
    idShort: "OperationalEnvironment",
    id: `urn:aas:sm:model:${model.id}:environment`,
    modelType: "Submodel",
    kind: "Instance",
    semanticId: semanticRef("https://admin-shell.io/idta/OperationalEnvironment/1/0"),
    submodelElements: [
      collection(
        "SupportedEnvironments",
        model.supportedEnv.map((env, i) => prop(`Environment_${i + 1}`, env)),
      ),
    ],
  }

  return {
    assetAdministrationShells: [
      {
        idShort: model.name,
        id: `urn:aas:model:${model.id}`,
        description: [{ language: "ko", text: model.purpose }],
        assetInformation: {
          assetKind: "Instance",
          globalAssetId: `urn:asset:model:${model.id}`,
        },
        submodels: [
          { type: "ModelReference", keys: [{ type: "Submodel", value: nameplate.id }] },
          { type: "ModelReference", keys: [{ type: "Submodel", value: environment.id }] },
        ],
      },
    ],
    submodels: [nameplate, environment],
    conceptDescriptions: [
      {
        idShort: "TaskType",
        id: "https://admin-shell.io/idta/cd/TaskType",
        description: [{ language: "en", text: "The machine learning task category." }],
      },
      {
        idShort: "Framework",
        id: "https://admin-shell.io/idta/cd/Framework",
        description: [{ language: "en", text: "The deep learning framework used." }],
      },
    ],
  }
}

/* ------------------------------------------------------------------ */
/* Dataset                                                             */
/* ------------------------------------------------------------------ */

export function buildDatasetAasEnv(dataset: Dataset): AasEnvironment {
  const nameplate = {
    idShort: "AIDatasetNameplate",
    id: `urn:aas:sm:dataset:${dataset.id}:nameplate`,
    modelType: "Submodel",
    kind: "Instance",
    semanticId: semanticRef("https://admin-shell.io/idta/AIDatasetNameplate/1/0"),
    description: [
      { language: "ko", text: "학습 데이터셋의 식별 및 명세 정보를 기술하는 서브모델입니다." },
    ],
    submodelElements: [
      collection("GeneralInformation", [
        prop("DatasetName", dataset.name),
        prop("Version", dataset.version),
        prop("Task", dataset.task),
        prop("DataType", dataset.dataType),
        prop("License", dataset.license),
        prop("CreatedAt", dataset.createdAt),
        mlp("Description", dataset.description),
      ]),
      collection("Statistics", [
        prop("TotalSamples", dataset.totalSamples),
        prop("ClassCount", dataset.classCount, "xs:int"),
        prop("LabelType", dataset.labelType),
        prop("Labeled", String(dataset.labeled), "xs:boolean"),
        prop("Synthetic", String(dataset.synthetic), "xs:boolean"),
        prop("SplitRatio", dataset.splitRatio.join(" / ")),
      ]),
      collection(
        "ClassDistribution",
        dataset.distribution.map((c) =>
          prop(c.label.replace(/\s+/g, ""), c.value, "xs:int"),
        ),
      ),
      collection(
        "Storage",
        [
          prop("Type", dataset.storage.type),
          prop("BasePath", dataset.storage.basePath),
          prop("Uri", dataset.storage.uri),
          prop("FileType", dataset.storage.fileType),
          prop("AnnotationFile", dataset.storage.annotationFile),
          prop("AnnotationFormat", dataset.storage.annotationFormat),
        ],
        "https://admin-shell.io/idta/Storage/1/0",
      ),
      collection("Traceability", [
        prop("ContactOrganization", dataset.traceability.contactOrg),
        prop("Department", dataset.traceability.department),
        prop("ContactPerson", dataset.traceability.contactPerson),
        prop("Email", dataset.traceability.email),
        prop("DataCollector", dataset.traceability.dataCollector),
        prop("EnvironmentConditions", dataset.traceability.environmentConditions),
      ]),
    ],
  }

  return {
    assetAdministrationShells: [
      {
        idShort: dataset.name,
        id: `urn:aas:dataset:${dataset.id}`,
        description: [{ language: "ko", text: dataset.description }],
        assetInformation: {
          assetKind: "Instance",
          globalAssetId: `urn:asset:dataset:${dataset.id}`,
        },
        submodels: [
          { type: "ModelReference", keys: [{ type: "Submodel", value: nameplate.id }] },
        ],
      },
    ],
    submodels: [nameplate],
    conceptDescriptions: [
      {
        idShort: "TaskType",
        id: "https://admin-shell.io/idta/cd/TaskType",
        description: [{ language: "en", text: "The machine learning task category." }],
      },
      {
        idShort: "LabelType",
        id: "https://admin-shell.io/idta/cd/LabelType",
        description: [{ language: "en", text: "The annotation / label format." }],
      },
    ],
  }
}

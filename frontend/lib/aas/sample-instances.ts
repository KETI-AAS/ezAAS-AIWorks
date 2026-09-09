/**
 * Mock AAS instances for the "ezAAS에서 내 모델 불러오기" (import from a connected
 * platform) path in the registration workflow. In a real deployment these would
 * be fetched from an AAS repository / registry the user is connected to; here we
 * ship a couple of representative AAS Environments so the flow is fully
 * demonstrable client-side.
 */

import type { AasEnvironment } from "./aas-types"

export type SampleInstance = {
  id: string
  name: string
  assetId: string
  platform: string
  updatedAt: string
  /** Short human summary of what the instance contains. */
  contains: string
  env: AasEnvironment
}

const surfaceInspection: AasEnvironment = {
  assetAdministrationShells: [
    {
      idShort: "SurfaceInspectionAAS",
      id: "https://factory.example/aas/surface-inspection",
      description: [{ language: "ko", text: "자동차 외관 표면 검사 AI 자산" }],
      assetInformation: {
        assetKind: "Instance",
        globalAssetId: "urn:factory:asset:surface-inspection:001",
      },
      submodels: [
        { type: "ModelReference", keys: [{ type: "Submodel", value: "urn:sm:dataset:surface" }] },
        { type: "ModelReference", keys: [{ type: "Submodel", value: "urn:sm:nameplate:surface" }] },
      ],
    },
  ],
  submodels: [
    {
      idShort: "AIDatasetNameplate",
      id: "urn:sm:dataset:surface",
      kind: "Instance",
      semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "https://admin-shell.io/idta/AIDataset/1/0" }] },
      description: [{ language: "ko", text: "표면 결함 라벨링 이미지 데이터셋" }],
      submodelElements: [
        { idShort: "DatasetName", modelType: "Property", valueType: "xs:string", value: "자동차 외관 표면 이미지" },
        { idShort: "Author", modelType: "Property", valueType: "xs:string", value: "제조혁신팀" },
        { idShort: "Version", modelType: "Property", valueType: "xs:string", value: "v2.1" },
        { idShort: "DataType", modelType: "Property", valueType: "xs:string", value: "이미지" },
        {
          idShort: "Metadata",
          modelType: "SubmodelElementCollection",
          value: [
            { idShort: "Filetype", modelType: "Property", valueType: "xs:string", value: "PNG" },
          ],
        },
        {
          idShort: "Description",
          modelType: "MultiLanguageProperty",
          value: [{ language: "ko", text: "정상/불량 표면 이미지 12,000장, 결함 부위 바운딩 박스 라벨 포함" }],
        },
        { idShort: "TotalSamples", modelType: "Property", valueType: "xs:integer", value: "12000" },
      ],
    },
    {
      idShort: "AIModelNameplate",
      id: "urn:sm:nameplate:surface",
      kind: "Instance",
      semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "https://admin-shell.io/idta/AIModelNameplate/1/0" }] },
      description: [{ language: "ko", text: "표면 결함 검출 YOLO 모델" }],
      submodelElements: [
        { idShort: "ModelName", modelType: "Property", valueType: "xs:string", value: "YOLOv8 표면 결함 검출" },
        { idShort: "Manufacturer", modelType: "Property", valueType: "xs:string", value: "비전AI팀" },
        { idShort: "Framework", modelType: "Property", valueType: "xs:string", value: "PyTorch" },
        { idShort: "ModelVersion", modelType: "Property", valueType: "xs:string", value: "v3.0" },
        {
          idShort: "PerformanceMetrics",
          modelType: "SubmodelElementCollection",
          value: [
            { idShort: "Accuracy", modelType: "Property", valueType: "xs:double", value: "0.973" },
            { idShort: "mAP50", modelType: "Property", valueType: "xs:double", value: "0.941" },
          ],
        },
      ],
    },
  ],
  conceptDescriptions: [],
}

const predictiveMaintenance: AasEnvironment = {
  assetAdministrationShells: [
    {
      idShort: "MotorPdMAAS",
      id: "https://factory.example/aas/motor-pdm",
      description: [{ language: "ko", text: "모터 이상 예지보전 AI 자산" }],
      assetInformation: {
        assetKind: "Instance",
        globalAssetId: "urn:factory:asset:motor-pdm:007",
      },
      submodels: [
        { type: "ModelReference", keys: [{ type: "Submodel", value: "urn:sm:dataset:motor" }] },
        { type: "ModelReference", keys: [{ type: "Submodel", value: "urn:sm:nameplate:motor" }] },
      ],
    },
  ],
  submodels: [
    {
      idShort: "TrainingDataset",
      id: "urn:sm:dataset:motor",
      kind: "Instance",
      semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "https://admin-shell.io/idta/AIDataset/1/0" }] },
      description: [{ language: "ko", text: "모터 진동 시계열 데이터셋" }],
      submodelElements: [
        { idShort: "Title", modelType: "Property", valueType: "xs:string", value: "모터 진동 센서 시계열" },
        { idShort: "Owner", modelType: "Property", valueType: "xs:string", value: "설비데이터팀" },
        { idShort: "DataType", modelType: "Property", valueType: "xs:string", value: "시계열" },
        {
          idShort: "Metadata",
          modelType: "SubmodelElementCollection",
          value: [
            { idShort: "Filetype", modelType: "Property", valueType: "xs:string", value: "CSV" },
          ],
        },
        { idShort: "License", modelType: "Property", valueType: "xs:string", value: "Internal" },
      ],
    },
    {
      idShort: "ModelNameplate",
      id: "urn:sm:nameplate:motor",
      kind: "Instance",
      semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "https://admin-shell.io/idta/AIModelNameplate/1/0" }] },
      description: [{ language: "ko", text: "모터 이상탐지 LSTM 오토인코더" }],
      submodelElements: [
        { idShort: "ModelName", modelType: "Property", valueType: "xs:string", value: "LSTM-AE 모터 이상탐지" },
        { idShort: "Manufacturer", modelType: "Property", valueType: "xs:string", value: "예지보전팀" },
        { idShort: "Task", modelType: "Property", valueType: "xs:string", value: "Anomaly Detection" },
      ],
    },
  ],
  conceptDescriptions: [],
}

/** Example that cannot be imported because it has no AI ModelNameplate. */
const datasetOnly: AasEnvironment = {
  assetAdministrationShells: [
    {
      idShort: "LegacyVisionDatasetAAS",
      id: "https://factory.example/aas/legacy-vision-dataset",
      description: [{ language: "ko", text: "AI Dataset만 등록된 레거시 비전 자산" }],
      assetInformation: {
        assetKind: "Instance",
        globalAssetId: "urn:factory:asset:legacy-vision-dataset:003",
      },
      submodels: [
        { type: "ModelReference", keys: [{ type: "Submodel", value: "urn:sm:dataset:legacy-vision" }] },
      ],
    },
  ],
  submodels: [
    {
      idShort: "AIDatasetNameplate",
      id: "urn:sm:dataset:legacy-vision",
      kind: "Instance",
      semanticId: {
        type: "ExternalReference",
        keys: [
          { type: "GlobalReference", value: "https://admin-shell.io/idta/AIDataset/1/0" },
        ],
      },
      description: [{ language: "ko", text: "레거시 부품 검사 이미지 데이터셋" }],
      submodelElements: [
        {
          idShort: "DatasetName",
          modelType: "Property",
          valueType: "xs:string",
          value: "레거시 부품 검사 이미지",
        },
        {
          idShort: "DataType",
          modelType: "Property",
          valueType: "xs:string",
          value: "이미지",
        },
        {
          idShort: "Metadata",
          modelType: "SubmodelElementCollection",
          value: [
            { idShort: "Filetype", modelType: "Property", valueType: "xs:string", value: "JPG" },
          ],
        },
      ],
    },
  ],
  conceptDescriptions: [],
}

export const sampleInstances: SampleInstance[] = [
  {
    id: "surface-inspection",
    name: "Surface Inspection AAS",
    assetId: "urn:factory:asset:surface-inspection:001",
    platform: "Factory AAS Repository",
    updatedAt: "2026-07-14",
    contains: "AI Dataset + AI ModelNameplate",
    env: surfaceInspection,
  },
  {
    id: "motor-pdm",
    name: "Motor PdM AAS",
    assetId: "urn:factory:asset:motor-pdm:007",
    platform: "Factory AAS Repository",
    updatedAt: "2026-06-28",
    contains: "AI Dataset + AI ModelNameplate",
    env: predictiveMaintenance,
  },
  {
    id: "legacy-vision-dataset",
    name: "Legacy Vision Dataset AAS",
    assetId: "urn:factory:asset:legacy-vision-dataset:003",
    platform: "Legacy AAS Repository",
    updatedAt: "2026-05-19",
    contains: "AI Dataset만 포함",
    env: datasetOnly,
  },
]

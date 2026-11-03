"""REST API (prefix: /api/v1)."""
from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, Body, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.mapping.schemas.build import AIReadyDataset, DatasetBuild, GenerateRequest
from app.mapping.schemas.legacy import ColumnMetadataInput, LegacyDataset
from app.mapping.schemas.mapping import DecisionRequest, MappingSpec, ReviewResponse
from app.mapping.schemas.requirement import RequirementSet
from app.mapping.services.pipeline import DecisionError, MappingService, NotFound, NotReady

router = APIRouter()
_service: Optional[MappingService] = None


def init_service(service: MappingService) -> None:
    global _service
    _service = service


def svc() -> MappingService:
    if _service is None:
        raise HTTPException(500, "service not initialized")
    return _service


def _handle(fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"not found: {e.args[0]}")
    except NotReady as e:
        raise HTTPException(status.HTTP_409_CONFLICT, {"message": str(e), "blocking_issues": e.issues})
    except DecisionError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, {"message": str(e)})
    except ValueError as e:
        raise HTTPException(422, {"message": str(e)})


# --------------------------------------------------------------------------- 요구조건
@router.post("/requirements/parse", response_model=RequirementSet, status_code=201,
             summary="AAS(AI Model Nameplate) → 모델 입력 요구조건 구성")
def parse_requirements(env: dict[str, Any] = Body(..., description="AAS Environment / Submodel JSON 또는 {inputs:[...]}")):
    return _handle(svc().parse_requirements, env)


@router.post("/requirements/parse-file", response_model=RequirementSet, status_code=201,
             summary="AAS JSON 파일 업로드로 요구조건 구성")
async def parse_requirements_file(file: UploadFile = File(...)):
    try:
        env = json.loads((await file.read()).decode("utf-8"))
    except Exception:
        raise HTTPException(422, "AAS JSON 파일을 읽을 수 없습니다 (AASX 는 capability-discovery 의 /aasx/convert 로 변환 후 사용)")
    return _handle(svc().parse_requirements, env)


@router.get("/requirements/{requirement_set_id}", response_model=RequirementSet)
def get_requirements(requirement_set_id: str):
    return _handle(svc().get_requirements, requirement_set_id)


# --------------------------------------------------------------------------- 레거시 데이터
@router.post("/legacy-datasets", response_model=LegacyDataset, status_code=201,
             summary="레거시 데이터 업로드·분석 (CSV/XLSX/Parquet/JSON + 선택 컬럼 메타데이터)")
async def upload_legacy(
    file: UploadFile = File(...),
    metadata: Optional[str] = Form(None, description='{"columns": {"col": {"description": "...", "unit": "m/s"}}}'),
    metadata_file: Optional[UploadFile] = File(None),
    name: Optional[str] = Form(None),
):
    data = await file.read()
    meta: Any = metadata
    if metadata_file is not None:
        meta = (await metadata_file.read()).decode("utf-8")
    return _handle(svc().register_legacy, data, file.filename or "upload.csv", meta, name)


@router.get("/legacy-datasets/{legacy_dataset_id}", response_model=LegacyDataset)
def get_legacy(legacy_dataset_id: str):
    return _handle(svc().get_legacy, legacy_dataset_id)


@router.patch("/legacy-datasets/{legacy_dataset_id}/columns/{column}", response_model=LegacyDataset,
              summary="컬럼 정보 보완(단위·설명·위치 등) → 재분석")
def supplement_column(legacy_dataset_id: str, column: str, body: ColumnMetadataInput, actor: Optional[str] = Query(None)):
    return _handle(svc().supplement_column, legacy_dataset_id, column, body, actor)


# --------------------------------------------------------------------------- 빌드(매핑 작업)
class CreateBuildRequest(BaseModel):
    requirement_set_id: str
    legacy_dataset_id: str
    top_k: Optional[int] = None  # None: 시스템 기본값, 0: 컬럼 수 기반 자동


@router.post("/builds", response_model=DatasetBuild, status_code=201,
             summary="Top-K 후보 검색 + 요구조건 기반 적합성 판단")
def create_build(body: CreateBuildRequest):
    return _handle(svc().create_build, body.requirement_set_id, body.legacy_dataset_id, body.top_k)


@router.get("/builds/{build_id}", response_model=DatasetBuild)
def get_build(build_id: str):
    return _handle(svc().get_build, build_id)


@router.get("/builds/{build_id}/review", response_model=ReviewResponse,
            summary="입력항목별 추천 근거·요구조건 비교·미확인 항목·변환 미리보기")
def review(build_id: str):
    return _handle(svc().review, build_id)


@router.post("/builds/{build_id}/decisions", response_model=ReviewResponse,
             summary="추천 수락 / 다른 후보 선택 / 정보 보완 / 미매핑")
def decisions(build_id: str, body: DecisionRequest):
    return _handle(svc().apply_decisions, build_id, body)


class ConfirmRequest(BaseModel):
    decided_by: Optional[str] = None


@router.post("/builds/{build_id}/confirm", response_model=MappingSpec, status_code=201,
             summary="확정 매핑 → 매핑·변환 명세 생성")
def confirm(build_id: str, body: ConfirmRequest = Body(default_factory=ConfirmRequest)):
    return _handle(svc().confirm, build_id, body.decided_by)


@router.post("/builds/{build_id}/generate", summary="매핑 명세 기반 추출·변환·검증 → AI-Ready 데이터셋")
def generate(build_id: str, body: GenerateRequest = Body(default_factory=GenerateRequest)):
    dataset, report = _handle(svc().generate, build_id, body)
    if dataset is None:
        raise HTTPException(422, {
            "message": "최종 검증 실패 — 매핑 또는 변환 조건 수정 후 재처리하세요",
            "validation": report.model_dump(mode="json"),
        })
    return dataset.model_dump(mode="json")


# --------------------------------------------------------------------------- 명세 / 데이터셋 / 이력
@router.get("/specs/{spec_id}", response_model=MappingSpec)
def get_spec(spec_id: str):
    return _handle(svc().get_spec, spec_id)


class ReuseRequest(BaseModel):
    legacy_dataset_id: str
    requirement_set_id: Optional[str] = None


@router.post("/specs/{spec_id}/reuse", summary="기존 매핑 명세 재사용 + 변경 영향 항목 재검토")
def reuse_spec(spec_id: str, body: ReuseRequest):
    return _handle(svc().reuse_spec, spec_id, body.legacy_dataset_id, body.requirement_set_id)


@router.get("/specs", response_model=list[MappingSpec], summary="재사용 가능한 명세 검색")
def find_specs(requirement_set_id: str, legacy_dataset_id: str):
    return _handle(svc().find_reusable_specs, requirement_set_id, legacy_dataset_id)


@router.get("/datasets/{dataset_id}", response_model=AIReadyDataset)
def get_dataset(dataset_id: str):
    return _handle(svc().get_dataset, dataset_id)


@router.get("/datasets/{dataset_id}/download")
def download_dataset(dataset_id: str):
    ds = _handle(svc().get_dataset, dataset_id)
    return FileResponse(ds.stored_path, filename=f"{ds.name}.{ds.format}")


@router.get("/history", summary="요구조건·매핑·검증·생성 이력")
def history(target_id: Optional[str] = None, limit: int = 200):
    return svc().repo.history(target_id, limit)


@router.get("/dictionary/concepts", summary="의미사전 개념 목록")
def concepts(category: Optional[str] = None):
    out = []
    for c in svc().dictionary.concepts.values():
        if category and c.category != category:
            continue
        out.append({"concept_id": c.concept_id, "category": c.category, "names": c.names, "quantity": c.quantity,
                    "default_unit": c.default_unit, "synonyms": c.synonyms, "abbreviations": c.abbreviations})
    return out

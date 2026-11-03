"""빌드(변환 작업)·검증·AI-Ready 데이터셋 스키마 (특허 10~11절).

DB ERD 대응: dataset_build / ai_ready_dataset 테이블.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field

from .candidate import InputCandidates
from .common import utcnow
from .mapping import InputMappingState, ProcessingOptions


class BuildStep(str, Enum):
    CANDIDATES_READY = "candidates_ready"   # 후보 검색·판단 완료, 사용자 확인 대기
    MAPPING_CONFIRMED = "mapping_confirmed"  # 매핑 명세 생성됨
    VALIDATION_FAILED = "validation_failed"
    COMPLETED = "completed"                 # AI-Ready 데이터셋 생성 완료


class DatasetBuild(BaseModel):
    build_id: str
    requirement_set_id: str
    legacy_dataset_id: str
    current_step: BuildStep = BuildStep.CANDIDATES_READY
    top_k: int
    candidates: dict[str, InputCandidates] = Field(default_factory=dict)
    states: dict[str, InputMappingState] = Field(default_factory=dict)
    spec_id: Optional[str] = None
    ai_ready_dataset_id: Optional[str] = None
    last_validation: Optional["ValidationReport"] = None
    reused_from_spec_id: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    completed_at: Optional[datetime] = None


class ValidationIssue(BaseModel):
    code: str
    severity: str                 # error / warning
    message: str
    input_id: Optional[str] = None
    source_column: Optional[str] = None


class ColumnStat(BaseModel):
    column: str
    dtype: str
    count: int
    missing: int
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    std: Optional[float] = None


class ValidationReport(BaseModel):
    passed: bool
    checked_at: datetime = Field(default_factory=utcnow)
    checks: dict[str, bool] = Field(default_factory=dict)
    issues: list[ValidationIssue] = Field(default_factory=list)
    column_stats: list[ColumnStat] = Field(default_factory=list)  # 품질 보조정보


class GenerateRequest(BaseModel):
    output_format: str = "csv"   # csv / parquet / json
    name: Optional[str] = None
    processing: Optional[ProcessingOptions] = None


class AIReadyDataset(BaseModel):
    ai_ready_dataset_id: str
    build_id: str
    spec_id: str
    spec_hash: Optional[str] = None
    name: str
    format: str
    version: str = "1"
    stored_path: str
    content_hash: str
    record_count: int
    column_count: int
    columns: list[str]
    validation: ValidationReport
    lineage: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)


DatasetBuild.model_rebuild()

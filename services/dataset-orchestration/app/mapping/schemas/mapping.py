"""사용자 확인 및 매핑·변환 명세 스키마 (특허 8~9절)."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from .candidate import CandidateEvaluation, CheckResult, InputCandidates, UnitConversion
from .common import utcnow
from .legacy import ColumnMetadataInput


# --------------------------------------------------------------------------- 사용자 확인
class DecisionType(str, Enum):
    ACCEPT_RECOMMENDATION = "accept_recommendation"   # 우선 추천 수락
    SELECT_CANDIDATE = "select_candidate"             # 다른 후보 선택
    SELECT_COLUMN = "select_column"                   # Top-K 밖의 컬럼 직접 선택
    LEAVE_UNMAPPED = "leave_unmapped"                 # 미매핑 유지 (선택 입력만 허용)
    SUPPLEMENT = "supplement"                         # 정보 보완 후 재판단 (매핑은 미확정)


class UserDecision(BaseModel):
    input_id: str
    decision: DecisionType
    column_name: Optional[str] = None
    # 정보 보완: 컬럼 메타데이터 (단위·설명·위치 등). 보완 시 재판단 수행
    supplement: Optional[ColumnMetadataInput] = None
    # 확인된 불일치가 있는 후보를 선택할 때 명시적 승인 필요
    acknowledge_mismatch: bool = False
    # 단위 미확인 후보: 사용자가 원천 단위를 직접 지정하지 않고 '요구 단위와 동일'로 간주할 때
    assume_target_unit: bool = False
    comment: Optional[str] = None
    decided_by: Optional[str] = None


class DecisionRequest(BaseModel):
    decisions: list[UserDecision]
    decided_by: Optional[str] = None


class InputMappingState(BaseModel):
    """입력항목별 현재 매핑 상태."""

    input_id: str
    status: Literal["pending", "confirmed", "unmapped"] = "pending"
    column_name: Optional[str] = None
    decision: Optional[UserDecision] = None
    evaluation: Optional[CandidateEvaluation] = None  # 확정 시점의 검토 결과(스냅샷)
    acknowledged_mismatches: list[str] = Field(default_factory=list)
    supplemented: dict[str, Any] = Field(default_factory=dict)
    decided_at: Optional[datetime] = None
    blocking_issues: list[str] = Field(default_factory=list)


class PreviewRow(BaseModel):
    source: Any
    converted: Any


class ReviewItem(BaseModel):
    """사용자 확인부가 입력항목별로 제공하는 정보 (특허 8절 목록)."""

    input_id: str
    input_name: str
    order_index: int
    is_required_input: bool
    requirement: dict[str, Any]            # 속성별 값/상태/필수여부
    requirement_unknowns: list[str]
    candidates: InputCandidates
    state: InputMappingState
    preview: list[PreviewRow] = Field(default_factory=list)


class ReviewResponse(BaseModel):
    build_id: str
    items: list[ReviewItem]
    ready_to_confirm: bool
    blocking_issues: list[str]


# --------------------------------------------------------------------------- 매핑 명세
class TargetInfo(BaseModel):
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    aas_identifier: Optional[str] = None
    submodel_id: Optional[str] = None
    requirement_set_id: str
    requirement_hash: Optional[str] = None


class SourceInfo(BaseModel):
    legacy_dataset_id: str
    name: str
    source_uri: Optional[str] = None
    connection_type: str
    content_hash: Optional[str] = None
    schema_hash: Optional[str] = None


class TransformSpec(BaseModel):
    source_dtype: str
    target_dtype: str
    unit_conversion: Optional[UnitConversion] = None
    output_column: str


class ConfirmationInfo(BaseModel):
    decision_type: DecisionType
    decided_by: Optional[str] = None
    decided_at: datetime
    acknowledged_mismatches: list[str] = Field(default_factory=list)
    supplemented_info: dict[str, Any] = Field(default_factory=dict)
    comment: Optional[str] = None


class MappingEntry(BaseModel):
    input_id: str
    input_name: str
    order_index: int
    is_required_input: bool
    target_semantic_id: Optional[str] = None
    target_aas_path: Optional[str] = None
    source_column: Optional[str]           # None → 미매핑(선택 입력)
    checks: list[CheckResult] = Field(default_factory=list)
    category: Optional[str] = None
    tier: Optional[str] = None
    similarity: Optional[float] = None
    transform: Optional[TransformSpec] = None
    confirmation: ConfirmationInfo


class MissingValuePolicy(str, Enum):
    KEEP = "keep"
    DROP_ROWS = "drop_rows"
    FORWARD_FILL = "ffill"
    MEAN = "mean"
    FAIL = "fail"


class ProcessingOptions(BaseModel):
    missing_values: MissingValuePolicy = MissingValuePolicy.KEEP
    sort_by_time: bool = True
    include_time_column: bool = False
    max_missing_ratio: Optional[float] = None  # 검증: 이 비율을 넘으면 실패
    enforce_value_conditions: bool = True


class MappingSpec(BaseModel):
    spec_id: str
    version: int = 1
    build_id: str
    status: Literal["confirmed", "superseded"] = "confirmed"
    target: TargetInfo
    source: SourceInfo
    time_column: Optional[str] = None
    entries: list[MappingEntry]
    processing: ProcessingOptions = Field(default_factory=ProcessingOptions)
    spec_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    parent_spec_id: Optional[str] = None

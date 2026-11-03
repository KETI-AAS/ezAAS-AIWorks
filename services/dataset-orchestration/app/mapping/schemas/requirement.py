"""모델 입력 요구조건 스키마 (특허 3절)."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .common import Fact, utcnow
from datetime import datetime


class Attr(str, Enum):
    """요구조건/컬럼 비교에 쓰이는 표준 속성 키."""

    CONCEPT = "concept"                          # 의미(개념) — 의미사전 concept_id
    QUANTITY = "quantity"                        # 물리량 (velocity, acceleration, temperature ...)
    UNIT = "unit"                                # 단위 (정규화 심볼)
    DATA_TYPE = "data_type"                      # 자료형 (float, integer, boolean, string, datetime)
    MEASUREMENT_TARGET = "measurement_target"    # 측정 대상 (motor_bearing ...)
    MEASUREMENT_LOCATION = "measurement_location"  # 측정 위치 (drive_end ...)
    VALUE_REPRESENTATION = "value_representation"  # 값의 표현 방식 (rms, peak, mean ...)
    TIME_CONDITION = "time_condition"            # 시간 조건 (샘플링 주기 등)


COMPARABLE_ATTRS: list[Attr] = [
    Attr.CONCEPT,
    Attr.QUANTITY,
    Attr.UNIT,
    Attr.DATA_TYPE,
    Attr.MEASUREMENT_TARGET,
    Attr.MEASUREMENT_LOCATION,
    Attr.VALUE_REPRESENTATION,
    Attr.TIME_CONDITION,
]


class RequirementAttribute(Fact):
    """요구조건 속성 = Fact + 필수 여부."""

    required: bool = False
    required_reason: Optional[str] = None


class ValueCondition(BaseModel):
    """입력값 조건 (AAS 에 명시된 경우만)."""

    min: Optional[float] = None
    max: Optional[float] = None
    allowed_values: Optional[list[str]] = None
    nullable: Optional[bool] = None


class ModelInputRequirement(BaseModel):
    input_id: str                     # 요구조건 내 고유 ID (예: in_01)
    order_index: int                  # 모델 입력 순서
    id_short: str                     # AAS 요소 idShort
    name: str                         # 모델이 요구하는 입력항목명(출력 컬럼명)
    display_name: Optional[str] = None
    definition: Optional[str] = None
    semantic_id: Optional[str] = None
    concept_description_id: Optional[str] = None
    is_required_input: bool = True
    attributes: dict[Attr, RequirementAttribute] = Field(default_factory=dict)
    value_condition: Optional[ValueCondition] = None
    synonyms: list[str] = Field(default_factory=list)
    aas_path: Optional[str] = None    # 참조한 AAS 요소 경로
    semantic_text: Optional[str] = None  # 임베딩용 의미 표현 (의미정보 보완 후 채워짐)

    def attr(self, key: Attr) -> RequirementAttribute:
        return self.attributes.get(key) or RequirementAttribute()

    @property
    def missing_attributes(self) -> list[Attr]:
        return [k for k in COMPARABLE_ATTRS if not self.attr(k).known]


class RequirementSet(BaseModel):
    """한 AI 모델(버전)의 전체 입력 요구조건."""

    requirement_set_id: str
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    aas_identifier: Optional[str] = None
    submodel_id: Optional[str] = None
    submodel_semantic_id: Optional[str] = None
    inputs: list[ModelInputRequirement]
    warnings: list[str] = Field(default_factory=list)
    content_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

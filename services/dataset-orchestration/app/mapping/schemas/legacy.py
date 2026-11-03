"""레거시 데이터 스키마 (특허 4절)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from .common import utcnow
from .requirement import Attr
from .common import Fact


class ColumnMetadataInput(BaseModel):
    """레거시 데이터와 함께 제공(또는 사용자가 보완)되는 컬럼 메타데이터."""

    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[str] = None
    measurement_target: Optional[str] = None
    measurement_location: Optional[str] = None
    value_representation: Optional[str] = None
    sensor: Optional[str] = None
    equipment: Optional[str] = None
    extra: dict[str, Any] = Field(default_factory=dict)


class DataProfile(BaseModel):
    inferred_dtype: str                 # float / integer / boolean / datetime / string / empty
    raw_dtype: str
    row_count: int
    missing_count: int
    missing_ratio: float
    unique_count: int
    sample_values: list[Any] = Field(default_factory=list)
    numeric_parse_ratio: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    std: Optional[float] = None
    is_monotonic_increasing: Optional[bool] = None
    hints: list[str] = Field(default_factory=list)  # 품질 보조정보(의미 확정에 사용하지 않음)


class ConceptLink(BaseModel):
    concept_id: str
    category: str                     # measurand / location / representation / target / quantity
    matched_term: str
    method: str                       # semantic_id / exact / synonym / abbreviation / llm
    status: str                       # InfoStatus 값
    source_field: str                 # name / description / semantic_id / ...


class ColumnProfile(BaseModel):
    column_name: str
    position: int
    description: Optional[str] = None
    metadata: ColumnMetadataInput = Field(default_factory=ColumnMetadataInput)
    tokens: list[str] = Field(default_factory=list)
    attributes: dict[Attr, Fact] = Field(default_factory=dict)
    concept_links: list[ConceptLink] = Field(default_factory=list)
    profile: DataProfile
    relations: list[str] = Field(default_factory=list)  # 다른 컬럼/테이블과의 관계
    semantic_text: Optional[str] = None
    notes: list[str] = Field(default_factory=list)

    def attr(self, key: Attr) -> Fact:
        return self.attributes.get(key) or Fact()


class LegacyDataset(BaseModel):
    legacy_dataset_id: str
    name: str
    source_uri: Optional[str] = None
    connection_type: str = "file"      # file / database / api
    file_format: Optional[str] = None  # csv / xlsx / parquet / json
    stored_path: Optional[str] = None  # 원천 보존 경로 (원본은 수정하지 않음)
    content_hash: Optional[str] = None
    schema_hash: Optional[str] = None
    record_count: int = 0
    column_count: int = 0
    columns: list[ColumnProfile] = Field(default_factory=list)
    time_column: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

    def column(self, name: str) -> Optional[ColumnProfile]:
        return next((c for c in self.columns if c.column_name == name), None)
